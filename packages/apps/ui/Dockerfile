FROM node:24-alpine

COPY .next/standalone /app/server
COPY .next/static /app/server/packages/apps/ui/.next/static

WORKDIR /app/server

ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["node", "packages/apps/ui/server.js"]
