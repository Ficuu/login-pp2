/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Empaqueta el server y solo las dependencias que usa en `.next/standalone`,
  // asi la imagen no lleva node_modules entero. Sin esto la imagen final pesa
  // varias veces mas y hay que copiar el proyecto completo.
  output: "standalone",
};

export default nextConfig;
