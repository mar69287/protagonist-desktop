"use client";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";
import Spinner from "@/components/ui/Spinner";

/**
 * Example showcase of reusable components
 * This demonstrates how to compose reusable components together
 */
export default function ComponentShowcase() {
  return (
    <Container className="py-12 space-y-12">
      {/* Buttons */}
      <section>
        <Heading size="lg" className="mb-6">
          Buttons
        </Heading>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button showArrow>With Arrow</Button>
        </div>
      </section>

      {/* Cards */}
      <section>
        <Heading size="lg" className="mb-6">
          Cards
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <Heading size="sm" className="mb-2">
              Default Card
            </Heading>
            <p className="text-gray-600">
              This is a simple card with default styling.
            </p>
          </Card>
          <Card variant="outlined" hover>
            <Heading size="sm" className="mb-2">
              Outlined Card
            </Heading>
            <p className="text-gray-600">
              This card has an outline and hover effect.
            </p>
          </Card>
          <Card variant="elevated" padding="lg">
            <Heading size="sm" className="mb-2">
              Elevated Card
            </Heading>
            <p className="text-gray-600">
              This card has a shadow and extra padding.
            </p>
          </Card>
        </div>
      </section>

      {/* Inputs */}
      <section>
        <Heading size="lg" className="mb-6">
          Inputs
        </Heading>
        <div className="max-w-md space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com" />
          <Input
            label="Password"
            type="password"
            helperText="Must be at least 8 characters"
          />
          <Input label="Username" error="Username is already taken" />
        </div>
      </section>

      {/* Badges */}
      <section>
        <Heading size="lg" className="mb-6">
          Badges
        </Heading>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge size="sm">Small</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </section>

      {/* Alerts */}
      <section>
        <Heading size="lg" className="mb-6">
          Alerts
        </Heading>
        <div className="space-y-4 max-w-2xl">
          <Alert variant="success" title="Success!">
            Your changes have been saved successfully.
          </Alert>
          <Alert variant="error" title="Error">
            Something went wrong. Please try again.
          </Alert>
          <Alert variant="warning" title="Warning">
            This action cannot be undone.
          </Alert>
          <Alert variant="info" title="Info">
            Here&apos;s some helpful information for you.
          </Alert>
        </div>
      </section>

      {/* Loading States */}
      <section>
        <Heading size="lg" className="mb-6">
          Loading States
        </Heading>
        <div className="flex items-center gap-6">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </section>

      {/* Composition Example */}
      <section>
        <Heading size="lg" className="mb-6">
          Composition Example
        </Heading>
        <Card variant="elevated" className="max-w-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Heading size="md" className="mb-1">
                Product Name
              </Heading>
              <Badge variant="success" size="sm">
                In Stock
              </Badge>
            </div>
            <span className="text-2xl font-bold text-purple-600">$29.99</span>
          </div>
          <p className="text-gray-600 mb-4">
            This is a great product that solves all your problems.
          </p>
          <div className="flex gap-3">
            <Button variant="primary" size="sm">
              Add to Cart
            </Button>
            <Button variant="secondary" size="sm">
              Learn More
            </Button>
          </div>
        </Card>
      </section>
    </Container>
  );
}
