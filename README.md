# Pointe Savanne

Villa booking management system for Villa Pointe Savanne. Handles customer registration, quotation requests, pricing calculations with seasonal rates, and PDF quotation generation.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3.4 or later

### Installation

```bash
bun install
```

### Running the Application

```bash
bun run dev
```

The server starts on port 3000 with hot module reloading enabled.

### Environment Setup

Copy `.env.dist` to `.env` and configure the required variables:

```bash
cp .env.dist .env
```

## Architecture

The project follows Domain-Driven Design (DDD) with a clear separation of concerns:

```
ts/
├── domain/           # Business logic and domain models
│   ├── booking/      # Quotation, pricing, tax, discounts
│   ├── customer/     # Registration, login, profile management
│   └── shared/       # Shared value objects and utilities
├── application/      # HTTP server and route handlers
└── infrastructure/   # External service implementations
```

### Domain Contexts

**Booking Context**
- Quotation requests and generation
- Pricing with seasonal rates and EUR formatting
- Tourist tax calculations (ranked/unranked)
- Time-based discounts (10% for 8-14 days, 15% for 15+ days)

**Customer Context**
- Email-based registration with encrypted passwords
- Authentication and profile management
- Token-based password recovery

### Key Patterns

- **Value Objects**: `Price`, `Email`, `CustomerId`
- **Use Cases**: Command/response pattern for business operations
- **In-memory Test Doubles**: For repository and gateway implementations

## Testing

### Unit Tests

```bash
bun test
```

With coverage:

```bash
bun test --coverage
```

### BDD Feature Tests

9 Cucumber feature files cover complete user journeys:

```bash
bun run test:features
```

Feature files are located in `/features`:
- `booking/`: Quotation requests, generation, pricing
- `customer/`: Registration, login, profile, password recovery

### Type Checking

```bash
bun run typecheck
```

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Implement changes following existing patterns
3. Add tests for new functionality
4. Run all tests and type checks before committing
5. Create a pull request

### Code Guidelines

- Follow DDD principles and existing directory structure
- Use value objects for domain primitives
- Write BDD scenarios for user-facing features
- Use in-memory test doubles for infrastructure dependencies
