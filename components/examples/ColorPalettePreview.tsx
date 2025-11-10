"use client";

import Card from "@/components/ui/Card";
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

/**
 * Visual preview of the vibrant color palette
 */
export default function ColorPalettePreview() {
  const colorSwatches = [
    {
      name: "Primary",
      description: "Vibrant Coral",
      colors: [
        { name: "50", hex: "#FFF1F2", text: "dark" },
        { name: "100", hex: "#FFE4E6", text: "dark" },
        { name: "200", hex: "#FFC7CC", text: "dark" },
        { name: "300", hex: "#FF9FA8", text: "dark" },
        { name: "400", hex: "#FF6B7A", text: "dark" },
        { name: "500", hex: "#FF4757", text: "light" },
        { name: "600", hex: "#FF3345", text: "light" },
        { name: "700", hex: "#E62E3D", text: "light" },
      ],
    },
    {
      name: "Accent",
      description: "Electric Cyan",
      colors: [
        { name: "50", hex: "#E0F7FA", text: "dark" },
        { name: "100", hex: "#B2EBF2", text: "dark" },
        { name: "200", hex: "#80DEEA", text: "dark" },
        { name: "300", hex: "#4DD0E1", text: "dark" },
        { name: "400", hex: "#26C6DA", text: "dark" },
        { name: "500", hex: "#00BCD4", text: "dark" },
        { name: "600", hex: "#00ACC1", text: "light" },
        { name: "700", hex: "#0097A7", text: "light" },
      ],
    },
    {
      name: "Success",
      description: "Fresh Mint",
      colors: [
        { name: "50", hex: "#F0FDF4", text: "dark" },
        { name: "100", hex: "#DCFCE7", text: "dark" },
        { name: "200", hex: "#BBF7D0", text: "dark" },
        { name: "300", hex: "#86EFAC", text: "dark" },
        { name: "400", hex: "#4ADE80", text: "dark" },
        { name: "500", hex: "#22C55E", text: "dark" },
        { name: "600", hex: "#16A34A", text: "light" },
      ],
    },
    {
      name: "Warning",
      description: "Bright Amber",
      colors: [
        { name: "50", hex: "#FFFBEB", text: "dark" },
        { name: "100", hex: "#FEF3C7", text: "dark" },
        { name: "200", hex: "#FDE68A", text: "dark" },
        { name: "300", hex: "#FCD34D", text: "dark" },
        { name: "400", hex: "#FBBF24", text: "dark" },
        { name: "500", hex: "#F59E0B", text: "dark" },
        { name: "600", hex: "#D97706", text: "light" },
      ],
    },
    {
      name: "Error",
      description: "Vibrant Red",
      colors: [
        { name: "50", hex: "#FEF2F2", text: "dark" },
        { name: "100", hex: "#FEE2E2", text: "dark" },
        { name: "200", hex: "#FECACA", text: "dark" },
        { name: "300", hex: "#FCA5A5", text: "dark" },
        { name: "400", hex: "#F87171", text: "dark" },
        { name: "500", hex: "#EF4444", text: "light" },
        { name: "600", hex: "#DC2626", text: "light" },
      ],
    },
    {
      name: "Info",
      description: "Electric Blue",
      colors: [
        { name: "50", hex: "#EFF6FF", text: "dark" },
        { name: "100", hex: "#DBEAFE", text: "dark" },
        { name: "200", hex: "#BFDBFE", text: "dark" },
        { name: "300", hex: "#93C5FD", text: "dark" },
        { name: "400", hex: "#60A5FA", text: "dark" },
        { name: "500", hex: "#3B82F6", text: "light" },
        { name: "600", hex: "#2563EB", text: "light" },
      ],
    },
  ];

  const specialColors = [
    { name: "Purple", hex: "#A855F7", description: "Vibrant Purple" },
    { name: "Yellow", hex: "#FFD93D", description: "Bright Yellow" },
  ];

  return (
    <Container className="py-12 space-y-12">
      <div className="text-center mb-12">
        <Heading size="2xl" className="mb-4">
          Vibrant Color Palette
        </Heading>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          A bright, energetic color system designed to make your designs stand
          out
        </p>
      </div>

      {/* Main Color Swatches */}
      <div className="space-y-8">
        {colorSwatches.map((swatch) => (
          <Card key={swatch.name} variant="elevated" padding="lg">
            <div className="mb-4">
              <Heading size="md" className="mb-1">
                {swatch.name}
              </Heading>
              <p className="text-neutral-600">{swatch.description}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {swatch.colors.map((color) => (
                <div key={color.name} className="text-center">
                  <div
                    className="w-full aspect-square rounded-lg mb-2 shadow-sm border border-neutral-200"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="text-xs font-medium text-neutral-700">
                    {color.name}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">
                    {color.hex}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Special Colors */}
      <Card variant="elevated" padding="lg">
        <Heading size="md" className="mb-6">
          Special Colors
        </Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {specialColors.map((color) => (
            <div key={color.name} className="text-center">
              <div
                className="w-full h-32 rounded-xl mb-4 shadow-md"
                style={{ backgroundColor: color.hex }}
              />
              <Heading size="sm" className="mb-1">
                {color.name}
              </Heading>
              <p className="text-sm text-neutral-600 mb-2">{color.description}</p>
              <code className="text-xs bg-neutral-100 px-2 py-1 rounded">
                {color.hex}
              </code>
            </div>
          ))}
        </div>
      </Card>

      {/* Component Examples */}
      <Card variant="elevated" padding="lg">
        <Heading size="md" className="mb-6">
          Components Using New Colors
        </Heading>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-neutral-700">
              Buttons
            </h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-3 text-neutral-700">
              Badges
            </h3>
            <div className="flex flex-wrap gap-3">
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Gradient Examples */}
      <Card variant="elevated" padding="lg">
        <Heading size="md" className="mb-6">
          Gradient Combinations
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="h-32 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, #FF4757, #00BCD4)",
            }}
          >
            Primary → Accent
          </div>
          <div
            className="h-32 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, #FF4757, #F59E0B)",
            }}
          >
            Primary → Warning
          </div>
          <div
            className="h-32 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, #00BCD4, #3B82F6)",
            }}
          >
            Accent → Info
          </div>
        </div>
      </Card>
    </Container>
  );
}

