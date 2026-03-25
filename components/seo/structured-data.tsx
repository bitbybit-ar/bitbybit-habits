export function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "BitByBit",
        description:
          "A habit tracker powered by Bitcoin Lightning Network that rewards task completion with real sats.",
        url: "https://bitbybit.com.ar",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        inLanguage: ["es", "en"],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "Organization",
        name: "BitByBit",
        url: "https://bitbybit.com.ar",
        logo: "https://bitbybit.com.ar/icons/icon.svg",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
