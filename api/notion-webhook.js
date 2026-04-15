import crypto from "node:crypto";

/**
 * Notion → GitHub → Vercel Publishing Pipeline
 *
 * Vercel serverless function that receives Notion webhook events,
 * converts page content to Markdown, and commits it to GitHub.
 *
 * Environment variables:
 *   NOTION_SECRET   – Notion internal integration token
 *   NOTION_VERIFICATION_TOKEN – Notion webhook verification token (HMAC-SHA256)
 *   GITHUB_TOKEN    – GitHub fine-grained PAT (Contents read+write)
 *   GITHUB_REPO     – owner/repo (e.g. "kygura/kygra-portfolio")
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function verifySignature(rawBody, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const expected = "sha256=" + hmac.digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature),
  );
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function richTextToPlain(richTextArray) {
  if (!Array.isArray(richTextArray)) return "";
  return richTextArray.map((rt) => rt.plain_text ?? "").join("");
}

// ── Notion → Markdown block converter ────────────────────────────────────────

function blockToMarkdown(block) {
  const type = block.type;

  switch (type) {
    case "paragraph":
      return richTextToPlain(block.paragraph?.rich_text);

    case "heading_1":
      return `# ${richTextToPlain(block.heading_1?.rich_text)}`;

    case "heading_2":
      return `## ${richTextToPlain(block.heading_2?.rich_text)}`;

    case "heading_3":
      return `### ${richTextToPlain(block.heading_3?.rich_text)}`;

    case "bulleted_list_item":
      return `- ${richTextToPlain(block.bulleted_list_item?.rich_text)}`;

    case "numbered_list_item":
      return `1. ${richTextToPlain(block.numbered_list_item?.rich_text)}`;

    case "code": {
      const lang = block.code?.language ?? "";
      const code = richTextToPlain(block.code?.rich_text);
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case "quote":
      return `> ${richTextToPlain(block.quote?.rich_text)}`;

    case "divider":
      return "---";

    case "image": {
      const url =
        block.image?.type === "external"
          ? block.image.external?.url
          : block.image?.file?.url;
      return url ? `![](${url})` : "";
    }

    default:
      // Silently ignore unsupported block types
      return null;
  }
}

function blocksToMarkdown(blocks) {
  return blocks
    .map(blockToMarkdown)
    .filter((line) => line !== null)
    .join("\n\n");
}

// ── Notion API helpers ───────────────────────────────────────────────────────

const NOTION_VERSION = "2022-06-28";

async function notionGet(path, notionSecret) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${notionSecret}`,
      "Notion-Version": NOTION_VERSION,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function fetchAllBlocks(pageId, notionSecret) {
  let blocks = [];
  let cursor;

  do {
    const qs = cursor
      ? `?page_size=100&start_cursor=${cursor}`
      : "?page_size=100";
    const data = await notionGet(
      `/blocks/${pageId}/children${qs}`,
      notionSecret,
    );
    blocks = blocks.concat(data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return blocks;
}

// ── GitHub API helpers ───────────────────────────────────────────────────────

async function githubGetFile(repo, filePath, token) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GET ${filePath} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function githubPutFile(repo, filePath, content, message, sha, token) {
  const body = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch: "master",
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${filePath} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function githubDeleteFile(repo, filePath, message, sha, token) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        sha,
        branch: "master",
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub DELETE ${filePath} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Extract frontmatter from Notion page properties ──────────────────────────

function extractFrontmatter(page) {
  const props = page.properties;

  // Title – look for a property of type "title"
  let title = "";
  for (const key of Object.keys(props)) {
    if (props[key].type === "title") {
      title = richTextToPlain(props[key].title);
      break;
    }
  }

  // Description / Excerpt
  const descProp = props["Description"] ?? props["Excerpt"];
  const description = descProp ? richTextToPlain(descProp.rich_text) : "";

  // Date
  const dateProp = props["Date"];
  let date;
  if (dateProp?.date?.start) {
    date = dateProp.date.start.slice(0, 10); // YYYY-MM-DD
  } else {
    date = page.created_time.slice(0, 10);
  }

  // Category
  const categoryProp = props["Category"];
  const category = categoryProp?.select?.name ?? "";

  // Tags
  const tagsProp = props["Tags"];
  const tags = (tagsProp?.multi_select ?? []).map((t) => t.name);

  // Type
  const typeProp = props["Type"];
  const type = typeProp?.select?.name ?? "Essay";

  return { title, description, date, category, tags, type };
}

function buildMarkdownFile(frontmatter, markdownBody) {
  const { title, description, date, type, category, tags } = frontmatter;
  const tagList = tags.map((t) => `"${t}"`).join(", ");

  return [
    "---",
    `title: ${title}`,
    `description: "${description}"`,
    `date: "${date}"`,
    `type: "${type}"`,
    `category: "${category}"`,
    `tags: [${tagList}]`,
    "---",
    "",
    markdownBody,
    "",
  ].join("\n");
}

// ── Raw body reader (Vercel bodyParser disabled) ─────────────────────────────

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Disable Vercel's automatic body parsing so we receive the raw bytes
// for accurate HMAC-SHA256 signature verification.
export const config = {
  api: { bodyParser: false },
};

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    NOTION_SECRET: notionSecret,
    NOTION_VERIFICATION_TOKEN: verificationToken,
    GITHUB_TOKEN: githubToken,
    GITHUB_REPO: githubRepo,
  } = process.env;

  if (!notionSecret || !verificationToken || !githubToken || !githubRepo) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  // 1. Read raw body and verify webhook signature
  const signature = req.headers["x-notion-signature"];
  if (!signature) {
    return res.status(401).json({ error: "Missing signature" });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: "Could not read request body" });
  }

  try {
    if (!verifySignature(rawBody, signature, verificationToken)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  } catch {
    return res.status(401).json({ error: "Invalid signature format" });
  }

  // 2. Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  const pageId = payload?.entity?.id;

  if (!pageId) {
    return res.status(400).json({ error: "Missing entity.id in payload" });
  }

  try {
    // 3. Fetch page from Notion
    const page = await notionGet(`/pages/${pageId}`, notionSecret);

    // 4. Extract frontmatter & slug
    const frontmatter = extractFrontmatter(page);
    const slug = slugify(frontmatter.title);

    if (!slug) {
      return res.status(400).json({ error: "Could not derive slug from title" });
    }

    const filePath = `src/posts/${slug}.md`;

    // Check Published checkbox
    const publishedProp = page.properties["Published"];
    const isPublished = publishedProp?.checkbox === true;

    if (!isPublished) {
      // ── Unpublish flow ────────────────────────────────────────────────
      const existing = await githubGetFile(githubRepo, filePath, githubToken);

      if (!existing) {
        return res.status(200).json({ skipped: true, reason: "not found" });
      }

      await githubDeleteFile(
        githubRepo,
        filePath,
        `unpublish: ${frontmatter.title}`,
        existing.sha,
        githubToken,
      );

      return res.status(200).json({ unpublished: true, slug });
    }

    // ── Publish flow ──────────────────────────────────────────────────

    // 5. Fetch blocks
    const blocks = await fetchAllBlocks(pageId, notionSecret);

    // 6. Convert to Markdown
    const markdownBody = blocksToMarkdown(blocks);

    // 7-9. Build full file
    const fileContent = buildMarkdownFile(frontmatter, markdownBody);

    // 10. Commit to GitHub
    const existing = await githubGetFile(githubRepo, filePath, githubToken);

    await githubPutFile(
      githubRepo,
      filePath,
      fileContent,
      `publish: ${frontmatter.title}`,
      existing?.sha,
      githubToken,
    );

    // 11. Return success
    return res.status(200).json({ published: true, slug });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
