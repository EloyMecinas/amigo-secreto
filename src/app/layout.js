import './globals.css';

export const metadata = {
  title: 'Amigo Secreto',
  description: 'Aplicación de Intercambio de Amigo Secreto',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="font-sans antialiased bg-[#FDFBF7]">
        {children}
      </body>
    </html>
  );
}