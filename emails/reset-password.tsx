import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import en from "@/lib/i18n/en.json";
import ar from "@/lib/i18n/ar.json";

const copy = { en: en.Auth.emails.reset, ar: ar.Auth.emails.reset };

export interface ResetPasswordEmailProps {
  url: string;
  locale?: "en" | "ar";
}

export default function ResetPasswordEmail({ url, locale = "en" }: ResetPasswordEmailProps) {
  const t = copy[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? ("right" as const) : ("left" as const);

  return (
    <Html dir={dir} lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={{ backgroundColor: "#fbf8f2", fontFamily: "sans-serif", padding: "24px 0" }}>
        <Container
          dir={dir}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            padding: "32px",
            margin: "0 auto",
            maxWidth: 480,
            textAlign: align,
          }}
        >
          <Heading style={{ color: "#1e1b16", fontSize: 22, margin: "0 0 16px" }}>
            {t.heading}
          </Heading>
          <Text style={{ color: "#5c5548", fontSize: 16, lineHeight: 1.6 }}>{t.body}</Text>
          <Section style={{ textAlign: align, margin: "24px 0" }}>
            <Button
              href={url}
              style={{
                backgroundColor: "#b8842e",
                color: "#ffffff",
                borderRadius: 8,
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {t.button}
            </Button>
          </Section>
          <Text style={{ color: "#a79e8e", fontSize: 13 }}>{t.ignore}</Text>
        </Container>
      </Body>
    </Html>
  );
}
