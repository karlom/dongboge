# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal tech blog built with Astro, focused on AI training and technology insights. The site runs in SSR mode with a Node.js adapter and integrates with Tencent Cloud CDN for static asset delivery and Supabase for contact form data storage.

## Development Commands

### Core Commands
```bash
# Start development server at http://localhost:4321
npm run dev

# Build for production (SSR output to dist/)
npm run build

# Preview production build locally
npm run preview

# Type-check TypeScript files
npx astro check
```

### SEO & Sitemap
```bash
# Generate sitemap with correct slug mappings
npm run seo:sitemap

# Submit sitemap to search engines (Baidu, Google, Bing)
npm run seo:submit

# Check SEO health and online status
npm run seo:check
npm run seo:online

# Run all SEO tasks in sequence
npm run seo:all
```

### Deployment
```bash
# Run simplified incremental deployment
npm run deploy:simple

# Test deployment without executing
npm run deploy:test

# Test individual deployment components
npm run deploy:test-server    # Test SSH connection
npm run deploy:test-cdn       # Test CDN connection
npm run deploy:sitemap        # Generate sitemap only

# Setup and debugging
npm run deploy:setup          # SSH authentication helper
npm run deploy:debug          # SSH connection debugger
npm run deploy:help           # Show all deployment commands
```

### CDN Asset Management
```bash
# Check CDN asset mapping status
npm run assets:check

# Fix missing asset mappings on CDN
npm run assets:fix

# Test asset mapping functionality
npm run assets:test
```

## Architecture

### Rendering Mode
- **SSR (Server-Side Rendering)** with Node.js standalone adapter
- Dynamic pages rendered on-demand at request time
- Output directory: `dist/` (contains both server code and static assets)

### Content Management
- **Blog posts**: Markdown/MDX files in `src/content/blog/`
- **Content Collections**: Defined in `src/content.config.ts` with zod schema validation
- **Frontmatter**: Includes `title`, `description`, `pubDate`, `heroImage`, `tags`, and **`slug`** (critical for URL routing)

### CDN Architecture
The site uses a split architecture:
- **Static assets** (fonts, images, CSS, JS): Served from Tencent Cloud COS via CDN (`https://cdn.dongboge.cn`)
- **HTML pages**: Served directly from the Node.js server

### CDN URL Handling
- Helper function `cdnUrl()` in `src/cdnConfig.ts` handles environment-specific paths
- Development: Returns local paths (`/src/assets/...`)
- Production: Returns CDN URLs (`https://cdn.dongboge.cn/...`)
- Asset path mapping is critical for proper CDN resource loading

### Slug Handling (CRITICAL)
**Problem**: Blog post URLs use the `slug` field from frontmatter, NOT the filename.

**Example**:
```markdown
---
title: "2024年十月重新出发"
slug: "2024-october-fresh-start"  # This becomes the URL path
pubDate: "Jul 19, 2025"
---
```
- Filename: `2024年十月重新出发.md`
- Correct URL: `/blog/2024-october-fresh-start/`
- Wrong URL: `/blog/2024年十月重新出发/`

**Always use the `slug` field when generating sitemaps, navigation, or references to blog posts.**

### Data Storage
- **Supabase**: Contact form submissions stored in `contact_submissions` table
- Client configured in `src/lib/supabase.ts`
- Forms on `/contact` page submit to Supabase
- Admin view at `/admin/contact-submissions` for reviewing submissions

### Deployment Scripts
The project has a modular deployment system in `scripts/`:
- **simple-deploy.js**: Main incremental deployment orchestrator
- **modules/change-detector.js**: Detects changed files
- **modules/sitemap-generator.js**: Generates sitemap with correct slugs
- **modules/server-sync.js**: Syncs files to server via SSH
- **modules/cdn-sync.js**: Uploads assets to Tencent COS/CDN

**Key Benefits**:
- Incremental uploads (only changed files)
- 60-70% faster than full deployment
- No service interruption
- Proper slug handling in sitemap

## Key Files & Directories

### Configuration
- `astro.config.mjs`: Astro configuration with SSR settings, CDN URL injection
- `src/content.config.ts`: Content collections schema
- `src/consts.ts`: Site metadata (title, description)
- `src/cdnConfig.ts`: CDN URL helper functions

### Content
- `src/content/blog/`: Markdown blog posts (use `slug` field!)
- `src/pages/`: Astro pages (file-based routing)
  - `index.astro`: Homepage with hero and blog sections
  - `blog/index.astro`: Blog listing page
  - `blog/[...slug].astro`: Dynamic blog post pages (uses frontmatter `slug`)
  - `contact.astro`: Contact form with Supabase integration
  - `admin/contact-submissions.astro`: Admin panel for form submissions

### Components
- `src/components/`: Reusable Astro components
- `src/layouts/`: Layout templates for pages

### Deployment
- `scripts/`: Deployment and utility scripts
- `.github/workflows/`: GitHub Actions workflows
  - `simple-deploy.yml`: Automated incremental deployment on content changes

## Environment Variables

### Required for Production
```bash
# Site Configuration
SITE_URL=https://dongboge.cn
PUBLIC_CDN_URL=https://cdn.dongboge.cn
NODE_ENV=production

# Tencent Cloud COS/CDN
TENCENT_SECRET_ID=your-secret-id
TENCENT_SECRET_KEY=your-secret-key
TENCENT_COS_BUCKET=your-bucket-name
TENCENT_COS_REGION=ap-guangzhou

# Server Deployment
HOST=your-server-host
USERNAME=your-username
SSH_PRIVATE_KEY=your-ssh-private-key
SSH_PASSPHRASE=your-ssh-passphrase  # if applicable
PORT=22  # optional

# Supabase
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Common Workflows

### Adding a New Blog Post
1. Create a new `.md` or `.mdx` file in `src/content/blog/`
2. Add frontmatter with **all required fields** (especially `slug`)
3. Write content in Markdown
4. Run `npm run dev` to preview
5. Commit and push (triggers auto-deployment if using GitHub Actions)

### Updating Deployment
1. Make changes to blog posts or assets
2. Run `npm run deploy:simple` for incremental deployment
3. OR push to GitHub to trigger automatic deployment
4. Verify with `npm run seo:online`

### Fixing Slug Issues
If URLs are incorrect:
1. Verify `slug` field exists in frontmatter
2. Run `node scripts/add-slugs-to-posts.js` to auto-generate missing slugs
3. Regenerate sitemap: `npm run seo:sitemap`
4. Redeploy: `npm run deploy:simple`

## Tech Stack

- **Framework**: Astro 5.x (SSR mode)
- **Styling**: Tailwind CSS
- **Content**: Markdown/MDX with Content Collections
- **CDN**: Tencent Cloud COS
- **Database**: Supabase
- **Deployment**: SSH to Node.js server
- **CI/CD**: GitHub Actions

## Important Notes

- Always use `slug` from frontmatter for URLs, never filenames
- CDN assets require proper CORS configuration (handled by deployment scripts)
- Test CDN connections before deployment with `npm run deploy:test-cdn`
- The site runs in SSR mode, not static generation
- Contact form submissions are stored in Supabase, not sent via email
