FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY lib ./lib
COPY public ./public
COPY server.mjs ./
ENV HOST=0.0.0.0
ENV PORT=43147
EXPOSE 43147
CMD ["node", "server.mjs"]
