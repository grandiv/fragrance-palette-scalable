import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed fragrance families
  const fragranceFamilies = [
    {
      name: "Citrus",
      description: "Fresh, zesty, and energizing scents",
      ingredients: ["Lemon", "Orange", "Bergamot", "Grapefruit", "Lime"],
    },
    {
      name: "Floral",
      description: "Elegant and feminine flower-based scents",
      ingredients: ["Rose", "Jasmine", "Lavender", "Geranium", "Ylang Ylang"],
    },
    {
      name: "Woody",
      description: "Warm, earthy, and sophisticated scents",
      ingredients: ["Cedarwood", "Sandalwood", "Pine", "Vetiver", "Oak"],
    },
    {
      name: "Oriental",
      description: "Rich, warm, and spicy scents",
      ingredients: ["Vanilla", "Amber", "Cinnamon", "Clove", "Patchouli"],
    },
    {
      name: "Fresh",
      description: "Clean, aquatic, and cooling scents",
      ingredients: ["Marine", "Mint", "Green Leaves", "Cucumber", "Water Lily"],
    },
    {
      name: "Gourmand",
      description: "Sweet, edible, and dessert-like scents",
      ingredients: ["Chocolate", "Coffee", "Honey", "Caramel", "Vanilla"],
    },
  ];

  console.log("Creating fragrance families...");
  for (const family of fragranceFamilies) {
    const existingFamily = await prisma.fragranceFamily.findUnique({
      where: { name: family.name },
    });

    if (!existingFamily) {
      await prisma.fragranceFamily.create({
        data: family,
      });
      console.log(`✅ Created fragrance family: ${family.name}`);
    } else {
      console.log(`ℹ️  Fragrance family already exists: ${family.name}`);
    }
  }

  // Optional: Create a demo user (for testing)
  const demoUser = {
    email: "demo@fragrancepalette.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewReZSaWaVRfzuQ2", // "password123"
  };

  const existingUser = await prisma.user.findUnique({
    where: { email: demoUser.email },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: demoUser,
    });
    console.log("✅ Created demo user");
  } else {
    console.log("ℹ️  Demo user already exists");
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
