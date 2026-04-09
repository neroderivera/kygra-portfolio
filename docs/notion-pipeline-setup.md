# Notion → GitHub → Vercel Publishing Pipeline Setup

This guide walks through configuring the automated pipeline that lets you publish blog posts from Notion directly to your portfolio site.

---

## 1. Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations).
2. Click **New integration**.
3. Name it (e.g. "Kygra Publisher"), select the workspace that contains your posts database.
4. Copy the **Internal Integration Secret** → this is your `NOTION_SECRET`.
5. Go to your posts database in Notion, click **⋯ → Connections → Add connection**, and share it with the integration you just created.

---

## 2. Notion Database Schema

Your posts database must include the following properties:

| Property      | Type         | Notes                                                     |
| ------------- | ------------ | --------------------------------------------------------- |
| **Title**     | Title        | The page title (default property)                         |
| **Published** | Checkbox     | Toggle to publish / unpublish                             |
| **Description** | Text       | Short excerpt shown in post listings                      |
| **Date**      | Date         | Publication date (`YYYY-MM-DD`); falls back to created_time |
| **Category**  | Select       | e.g. Philosophy, Technology, Culture                      |
| **Tags**      | Multi-select | e.g. philosophy, modernity, economics                     |
| **Type**      | Select       | e.g. Essay, Note, Analysis (defaults to "Essay")          |

---

## 3. Notion Webhook

1. In the [integration settings](https://www.notion.so/my-integrations), open your integration.
2. Navigate to the **Webhooks** section and add a new webhook.
3. Set the **URL** to:
   ```
   https://kygra.xyz/api/notion-webhook
   ```
4. Subscribe to events: **page.properties_updated** and **page.created**
5. Complete the verification handshake. Copy the **verification token** → this is your `NOTION_VERIFICATION_TOKEN`.

---

## 4. GitHub Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new).
2. Set **Repository access** to **Only select repositories** and pick `kygura/kygra-portfolio`.
3. Under **Permissions → Repository permissions**, grant **Contents**: Read and write.
4. Generate the token → this is your `GITHUB_TOKEN`.

---

## 5. Vercel Environment Variables

In the [Vercel dashboard](https://vercel.com), open your project and navigate to **Settings → Environment Variables**.

Add the following variables for **Production**, **Preview**, and **Development**:

| Variable         | Value                          |
| ---------------- | ------------------------------ |
| `NOTION_SECRET`              | *(from step 1)*                |
| `NOTION_VERIFICATION_TOKEN`  | *(from step 3)*                |
| `GITHUB_TOKEN`               | *(from step 4)*                |
| `GITHUB_REPO`                | `kygura/kygra-portfolio`       |

---

## 6. Verify Deployment

1. **Push any change** to `master` and confirm that Vercel builds successfully.
2. **Toggle Published** on a Notion page in your database.
3. Check that `src/posts/{slug}.md` appears (or is updated) in the GitHub repo.
4. Verify the site rebuilds automatically on Vercel and the new post is live.

---

## Troubleshooting

- **401 from webhook**: Double-check that `NOTION_VERIFICATION_TOKEN` matches the verification token from your Notion integration's webhook handshake.
- **Post not appearing**: Ensure the database is shared with the integration (step 1.5) and that the **Published** checkbox is checked.
- **GitHub commit fails**: Verify `GITHUB_TOKEN` has Contents read+write permission on the correct repository.
- **Slug collisions**: Slugs are derived from the page title. If two pages have the same title, the second publish will overwrite the first.
