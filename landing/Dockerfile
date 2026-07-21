# Static page — nginx just serves index.html. Deployable on Coolify as a
# Dockerfile app the same way as the backend, or skip this entirely and use
# any static host (Vercel/Netlify/GitHub Pages/Cloudflare Pages) instead.
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
