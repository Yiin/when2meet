FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app .
ENV PORT=3000
ENV DB_PATH=/data/when2meet.db
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
