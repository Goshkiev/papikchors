# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_CLUB_SLUG=papikchors
ARG VITE_BOOKING_API_URL
ARG VITE_BOOKING_APP_URL
ENV VITE_CLUB_SLUG=$VITE_CLUB_SLUG
ENV VITE_BOOKING_API_URL=$VITE_BOOKING_API_URL
ENV VITE_BOOKING_APP_URL=$VITE_BOOKING_APP_URL
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app/.output
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=build /app/.output ./
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=6 --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
