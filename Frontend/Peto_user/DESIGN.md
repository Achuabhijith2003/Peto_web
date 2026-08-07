---
name: Warm Companionship
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#534434'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#867461'
  outline-variant: '#d8c3ad'
  surface-tint: '#855300'
  primary: '#855300'
  on-primary: '#ffffff'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#ffb95f'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#30c88f'
  on-tertiary-container: '#004e34'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  headline-xl:
    fontFamily: Quicksand
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 20px
---

## Brand & Style
The brand personality centers on the intersection of joy and reliability. This design system serves pet owners who view their animals as family members, requiring an emotional response that is simultaneously uplifting and reassuring. 

The aesthetic leverages a **Modern-Organic** style. It combines the structured clarity of modern SaaS interfaces with the soft, tactile friendliness of consumer lifestyle brands. Key visual drivers include generous whitespace to reduce cognitive load, high-quality pet photography with shallow depth-of-field, and a playful yet disciplined use of iconography. The interface should feel like a premium concierge service—expert, approachable, and deeply caring.

## Colors
The palette is rooted in a "Warm/Cool" balance to differentiate between commerce and care.

- **Primary (Amber Orange):** Used for high-intent actions, energy, and playfulness. It represents the active bond between pet and owner.
- **Secondary (Friendly Blue):** Utilized for information architecture, utility links, and trust-building elements like reviews or certifications.
- **Tertiary (Sage Green):** Reserved exclusively for health, wellness, and veterinary-related modules to evoke a sense of calm and natural vitality.
- **Surface & Backgrounds:** We use a "Paper White" (#FFFFFF) for primary surfaces and "Cloud Gray" (#F9FAFB) for secondary background sections to maintain a crisp, clean environment.

## Typography
The typographic system creates a clear hierarchy through font personality. 

**Quicksand** is used for all headlines and brand moments. Its rounded terminals mirror the "soft" brand personality and ensure the UI never feels overly formal or intimidating.

**Inter** is the workhorse for all functional text. It provides the necessary professional weight and legibility for product descriptions, health records, and checkout flows. 

- Use **Headline-XL** sparingly for hero sections only.
- **Label-MD** should be used for category tags and small headers within cards, utilizing its uppercase styling for structural clarity.

## Layout & Spacing
The system follows a strict **8px grid** to maintain visual rhythm. 

- **Desktop:** 12-column fluid grid with 24px gutters. Content is centered in a max-width container of 1280px.
- **Tablet:** 8-column grid with 20px gutters.
- **Mobile:** 4-column grid with 16px gutters and 20px side margins.

Spacing between related elements (like a photo and its caption) should be `8px` or `16px`. Spacing between distinct sections should be `64px` or `80px` to allow the design to "breathe," reinforcing the premium and calm brand feel.

## Elevation & Depth
Depth is conveyed through **Ambient Shadows** and **Tonal Layering**. 

We avoid harsh borders in favor of soft, diffused shadows that lift components off the background. 
- **Level 1 (Low):** Used for cards and input fields. A subtle blur (4px) with 5% opacity.
- **Level 2 (Medium):** Used for hover states and navigation bars. A 12px blur with 8% opacity.
- **Level 3 (High):** Used for modals and floating action buttons. A 24px blur with 12% opacity, tinted slightly with the primary blue color to avoid "dirty" grays.

Layering is also used: background sections can use the primary orange or secondary blue at 5% opacity to create distinct zones without adding heavy visual weight.

## Shapes
The shape language is consistently "Rounded." Sharp corners are strictly avoided to maintain a friendly and safe atmosphere. 

- **Standard Elements:** Buttons, inputs, and small cards use a 0.5rem (8px) radius.
- **Large Elements:** Featured product cards and hero image containers use a 1rem (16px) radius.
- **Interactive Prompts:** Chips and badges use a full pill-shape (circular ends) to distinguish them from structural elements.

## Components

### Buttons
Primary buttons use the Warm Orange background with white text, utilizing a bold font weight. Secondary buttons use the Friendly Blue as an outline or ghost variant. All buttons feature a 0.5rem radius and a slight scale-up (1.02x) on hover.

### Cards
Cards are the primary container for products and pets. They feature a white background, Level 1 elevation, and 1rem rounded corners. Product cards should always include a "Quick Add" button that appears on hover.

### Inputs & Selects
Form fields use a light gray background (#F3F4F6) with no border in their default state. Upon focus, they transition to a white background with a 2px Friendly Blue border and a soft blue glow.

### Chips & Badges
Used for animal categories (e.g., "Dog," "Cat," "Small Pet") or status (e.g., "In Stock"). These are pill-shaped with low-saturation background tints derived from the primary and secondary colors.

### Health Alerts (Sage Green)
A specialized component for veterinary reminders or health tips. These should use the Sage Green as a left-border accent or a soft background fill to immediately signal "Wellness" to the user.

### Imagery
Photography should always be bright, featuring natural lighting and diverse pets. Illustrations should follow a "thin-line" style with rounded ends and occasional pops of the brand colors.