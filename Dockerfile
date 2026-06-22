# Gunakan image Node.js versi ringan
FROM node:18-alpine

# Set direktori kerja di dalam container
WORKDIR /app

# Salin package.json dan install dependensi (untuk caching optimal)
COPY package*.json ./
RUN npm install --production

# Salin seluruh sisa source code
COPY . .

# Buka port 3000
EXPOSE 3000

# Perintah untuk menjalankan aplikasi
CMD ["npm", "start"]