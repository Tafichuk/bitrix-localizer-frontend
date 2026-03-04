FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY build/ ./build/
CMD sh -c "serve -s build -l ${PORT:-3000}"
