import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, GitCommit } from "lucide-react";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";

const Writings = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const posts = useMarkdownPosts();

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags)));

  const filteredPosts = selectedTag
    ? posts.filter((post) => post.tags.includes(selectedTag))
    : posts;

  return (
    <div className="px-6 md:px-12 lg:px-16 py-16 md:py-24 max-w-[1000px] mx-auto animate-fade-in">
      <div className="max-w-3xl mb-16 pl-8 md:pl-0">
        <h1 className="text-5xl md:text-6xl font-display font-light mb-6 tracking-tight">Writings</h1>
        <p className="text-xl md:text-2xl font-light text-muted-foreground leading-relaxed">
          Thoughts on the arts, engineering, the esoteric and the existential
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-16 pl-8 md:pl-0">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-4 py-1.5 text-sm rounded-full transition-all duration-300 border ${selectedTag === null
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "bg-white/80 dark:bg-secondary/50 text-muted-foreground border-border/40 shadow-sm hover:bg-white dark:hover:bg-secondary hover:text-foreground hover:border-primary/30"
            }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-1.5 text-sm rounded-full transition-all duration-300 border ${selectedTag === tag
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-white/80 dark:bg-secondary/50 text-muted-foreground border-border/40 shadow-sm hover:bg-white dark:hover:bg-secondary hover:text-foreground hover:border-primary/30"
              }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="relative border-l border-border/40 ml-4 md:ml-0 space-y-12 pb-12">
        {filteredPosts.map((post, index) => (
          <div key={post.slug} className="relative pl-8 md:pl-12 group" style={{ animationDelay: `${index * 100}ms` }}>
            {/* Tree Branch Node */}
            <div className="absolute -left-[5px] top-2 w-[9px] h-[9px] rounded-full bg-background border border-primary/60 group-hover:border-primary group-hover:scale-125 transition-all duration-300 z-10" />

            {/* Horizontal Connector Line */}
            <div className="absolute left-0 top-[1.15rem] w-6 md:w-8 h-px bg-border/40 group-hover:bg-primary/30 transition-colors duration-300" />

            <article className="relative">
              <Link to={`/writings/${post.slug}`} className="block group/link">
                <header className="mb-4">
                  <div className="flex items-center gap-3 mb-2 text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">
                    <span className="text-primary/70">{post.category}</span>
                    <span>•</span>
                    <span>{new Date(post.date).getFullYear()}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light text-foreground/90 group-hover/link:text-foreground transition-colors leading-tight mb-3">
                    {post.title}
                  </h2>
                  <p className="text-lg text-muted-foreground/80 font-light leading-relaxed max-w-2xl">
                    {post.excerpt}
                  </p>
                </header>

                {/* Metadata Separator & Frontmatter */}
                <div className="border-t border-border/40 pt-4 mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-mono">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary/60" />
                    <span>
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary/60" />
                    <span>{post.readTime} min read</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-primary/60" />
                    <span className="opacity-70">
                      {post.tags.slice(0, 3).join(", ")}
                    </span>
                  </div>

                  <div className="ml-auto opacity-0 group-hover/link:opacity-100 -translate-x-4 group-hover/link:translate-x-0 transition-all duration-300">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </Link>
            </article>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Writings;
