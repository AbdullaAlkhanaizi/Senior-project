import "./globals.css";

export const metadata = {
  title: "Legal Consultant Senior Project",
  description: "Local legal consultant website with auth pages, home hub, chatbot shell, and messaging workspace."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
