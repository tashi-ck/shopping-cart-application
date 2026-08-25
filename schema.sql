CREATE TABLE "Users" (
    "UserId" SERIAL PRIMARY KEY,
    "Auth0Id" VARCHAR(255) NOT NULL UNIQUE,
    "Email" VARCHAR(255) NOT NULL,
    "FirstName" VARCHAR(100),
    "LastName" VARCHAR(100),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Categories" (
    "CategoryId" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT
);

CREATE TABLE "Products" (
    "ProductId" SERIAL PRIMARY KEY,
    "CategoryId" INT NOT NULL REFERENCES "Categories"("CategoryId"),
    "Name" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "Price" DECIMAL(10,2) NOT NULL,
    "StockQuantity" INT NOT NULL DEFAULT 0,
    "ImageUrl" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Carts" (
    "CartId" SERIAL PRIMARY KEY,
    "UserId" INT NOT NULL UNIQUE REFERENCES "Users"("UserId") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "CartItems" (
    "CartItemId" SERIAL PRIMARY KEY,
    "CartId" INT NOT NULL REFERENCES "Carts"("CartId") ON DELETE CASCADE,
    "ProductId" INT NOT NULL REFERENCES "Products"("ProductId"),
    "Quantity" INT NOT NULL CHECK ("Quantity" > 0),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("CartId", "ProductId")
);

CREATE TABLE "Orders" (
    "OrderId" SERIAL PRIMARY KEY,
    "UserId" INT NOT NULL REFERENCES "Users"("UserId"),
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "TotalAmount" DECIMAL(10,2) NOT NULL,
    "ShippingAddress" TEXT NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "OrderItems" (
    "OrderItemId" SERIAL PRIMARY KEY,
    "OrderId" INT NOT NULL REFERENCES "Orders"("OrderId") ON DELETE CASCADE,
    "ProductId" INT NOT NULL REFERENCES "Products"("ProductId"),
    "Quantity" INT NOT NULL CHECK ("Quantity" > 0),
    "UnitPrice" DECIMAL(10,2) NOT NULL
);