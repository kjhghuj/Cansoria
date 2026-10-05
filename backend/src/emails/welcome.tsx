import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import * as React from "react";

interface CansoriaWelcomeEmailProps {
    firstName?: string;
    discountCode?: string;
    validUntil?: string;
}

export const CansoriaWelcomeEmail = ({
    firstName = "Valued Customer",
    discountCode,
    validUntil,
}: CansoriaWelcomeEmailProps) => {
    const storefrontUrl = process.env.STOREFRONT_URL || process.env.FRONTEND_URL || "http://localhost:3030";

    return (
        <Html>
            <Head />
            <Preview>Welcome to Cansoria Studio</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img
                            src="https://placehold.co/180x56?text=CANSORIA"
                            width="180"
                            height="56"
                            alt="Cansoria Studio"
                            style={logo}
                        />
                    </Section>

                    <Section style={content}>
                        <Heading style={heading}>Welcome to Cansoria Studio.</Heading>
                        <Text style={greeting}>Hi {firstName},</Text>
                        <Text style={paragraph}>
                            Thank you for creating an account with Cansoria. We create hand-painted oil portraits, custom canvas artwork, and meaningful wall art made to order.
                        </Text>
                        <Text style={paragraph}>
                            You will receive studio notes, custom painting ideas, and private offers for artwork that feels personal in your home.
                        </Text>

                        {discountCode && (
                            <Section style={discountContainer}>
                                <Text style={discountTitle}>Your Studio Welcome Gift</Text>
                                <Text style={discountText}>
                                    As a thank you for joining us, please enjoy 15% off your first painting.
                                </Text>
                                <Section style={codeBox}>
                                    <Text style={codeText}>{discountCode}</Text>
                                </Section>
                                {validUntil && (
                                    <Text style={expiryText}>Valid until {validUntil}</Text>
                                )}
                            </Section>
                        )}

                        <Section style={buttonContainer}>
                            <Button style={button} href={`${storefrontUrl}/shop`}>
                                Explore Paintings
                            </Button>
                        </Section>

                        <Text style={supportNote}>
                            If you have any questions, just reply to this email. We are here to help with sizes, references, framing, and delivery.
                        </Text>
                    </Section>

                    <Hr style={divider} />

                    <Section style={footer}>
                        <Text style={footerText}>
                            Cansoria Studio, online art studio serving homes worldwide
                        </Text>
                        <Text style={footerLinks}>
                            <Link href={storefrontUrl} style={link}>Visit Website</Link>
                            {" | "}
                            <Link href="https://instagram.com/cansoria" style={link}>Instagram</Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default CansoriaWelcomeEmail;

const main = {
    backgroundColor: "#f7f4ef",
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    padding: "20px 0",
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "40px",
    marginBottom: "64px",
    border: "1px solid #eee6dc",
    maxWidth: "580px",
};

const header = {
    marginBottom: "32px",
    textAlign: "center" as const,
};

const logo = {
    margin: "0 auto",
};

const content = {
    paddingBottom: "20px",
};

const heading = {
    fontSize: "24px",
    lineHeight: "1.3",
    fontWeight: "600",
    color: "#2d2926",
    marginBottom: "24px",
    textAlign: "left" as const,
};

const greeting = {
    fontSize: "16px",
    lineHeight: "26px",
    color: "#332d28",
    marginBottom: "16px",
    fontWeight: "500",
};

const paragraph = {
    fontSize: "16px",
    lineHeight: "26px",
    color: "#5d534b",
    marginBottom: "20px",
};

const discountContainer = {
    backgroundColor: "#f7f2ec",
    padding: "24px",
    margin: "24px 0",
    border: "1px solid #eadfd3",
    textAlign: "center" as const,
};

const discountTitle = {
    fontSize: "14px",
    fontWeight: "600",
    color: "#2d2926",
    textTransform: "uppercase" as const,
    marginBottom: "8px",
};

const discountText = {
    fontSize: "14px",
    color: "#5d534b",
    marginBottom: "16px",
};

const codeBox = {
    backgroundColor: "#ffffff",
    border: "1px dashed #bca083",
    padding: "8px 16px",
    display: "inline-block",
    marginBottom: "12px",
};

const codeText = {
    fontSize: "18px",
    fontWeight: "700",
    color: "#2d2926",
    letterSpacing: "1px",
    margin: "0",
};

const expiryText = {
    fontSize: "12px",
    color: "#8a8178",
    margin: "0",
};

const buttonContainer = {
    textAlign: "center" as const,
    margin: "32px 0",
};

const button = {
    backgroundColor: "#2d2926",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "12px 32px",
};

const supportNote = {
    fontSize: "14px",
    lineHeight: "24px",
    color: "#737373",
    marginTop: "20px",
};

const divider = {
    borderColor: "#eee6dc",
    margin: "30px 0 20px",
};

const footer = {
    textAlign: "center" as const,
};

const footerText = {
    fontSize: "12px",
    lineHeight: "20px",
    color: "#8a8178",
    marginBottom: "10px",
};

const footerLinks = {
    fontSize: "12px",
    color: "#8a8178",
};

const link = {
    color: "#8c6b54",
    textDecoration: "underline",
};
