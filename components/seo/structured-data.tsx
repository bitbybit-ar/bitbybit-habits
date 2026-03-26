interface StructuredDataProps {
  locale: string;
}

export function StructuredData({ locale }: StructuredDataProps) {
  const description =
    locale === "en"
      ? "A habit tracker powered by Bitcoin Lightning Network that rewards task completion with real sats."
      : "Un habit tracker con Bitcoin Lightning Network que recompensa completar tareas con sats reales.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "BitByBit",
        description,
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
