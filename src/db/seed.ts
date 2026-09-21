import "dotenv/config";
import { db, pool } from "./index";
import {
  roles,
  profiles,
  categories,
  menuItems,
  inventoryItems,
  recipes,
  carts,
  canteenSettings,
} from "./schema";
import { hashPassword } from "../lib/password";

async function main() {
  console.log("Seeding database...");

  // Roles reference table
  const roleNames = ["customer", "admin", "kitchen", "cashier"] as const;
  for (const name of roleNames) {
    await db.insert(roles).values({ name, description: `${name} role` }).onConflictDoNothing();
  }

  // Demo accounts (idempotent-ish via onConflictDoNothing on email unique index)
  const demoUsers = [
    { fullName: "Ava Admin", email: "admin@canteen.app", phone: "9876500001", role: "admin" as const, password: "Admin@123" },
    { fullName: "Kevin Kitchen", email: "kitchen@canteen.app", phone: "9876500002", role: "kitchen" as const, password: "Kitchen@123" },
    { fullName: "Casey Cashier", email: "cashier@canteen.app", phone: "9876500003", role: "cashier" as const, password: "Cashier@123" },
    { fullName: "Riya Sharma", email: "student@canteen.app", phone: "9876500004", role: "customer" as const, password: "Student@123" },
  ];

  for (const u of demoUsers) {
    const passwordHash = await hashPassword(u.password);
    const [inserted] = await db
      .insert(profiles)
      .values({
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        passwordHash,
      })
      .onConflictDoNothing({ target: profiles.email })
      .returning();

    if (inserted && u.role === "customer") {
      await db.insert(carts).values({ userId: inserted.id }).onConflictDoNothing();
    }
  }

  // Categories
  const categoryData = [
    { name: "Breakfast", description: "Start your day right", imageUrl: "/images/cat-breakfast.jpg", sortOrder: 1 },
    { name: "Main Course", description: "Hearty, wholesome meals", imageUrl: "/images/cat-main.jpg", sortOrder: 2 },
    { name: "Snacks", description: "Quick bites between classes", imageUrl: "/images/cat-snacks.jpg", sortOrder: 3 },
    { name: "Beverages", description: "Sip something refreshing", imageUrl: "/images/cat-beverages.jpg", sortOrder: 4 },
    { name: "Desserts", description: "Sweet endings", imageUrl: "/images/cat-desserts.jpg", sortOrder: 5 },
  ];

  const insertedCategories: Record<string, string> = {};
  for (const c of categoryData) {
    const [row] = await db
      .insert(categories)
      .values(c)
      .onConflictDoUpdate({ target: categories.name, set: { description: c.description, imageUrl: c.imageUrl, sortOrder: c.sortOrder } })
      .returning();
    insertedCategories[c.name] = row.id;
  }

  // Inventory items
  const inventoryData = [
    { name: "Rice", unit: "kg", quantityOnHand: "40", minThreshold: "10", costPerUnit: "60" },
    { name: "Wheat Flour", unit: "kg", quantityOnHand: "35", minThreshold: "10", costPerUnit: "45" },
    { name: "Paneer", unit: "kg", quantityOnHand: "12", minThreshold: "5", costPerUnit: "320" },
    { name: "Chicken", unit: "kg", quantityOnHand: "18", minThreshold: "6", costPerUnit: "220" },
    { name: "Potatoes", unit: "kg", quantityOnHand: "25", minThreshold: "8", costPerUnit: "30" },
    { name: "Onions", unit: "kg", quantityOnHand: "22", minThreshold: "8", costPerUnit: "35" },
    { name: "Tomatoes", unit: "kg", quantityOnHand: "20", minThreshold: "8", costPerUnit: "40" },
    { name: "Cooking Oil", unit: "litre", quantityOnHand: "15", minThreshold: "5", costPerUnit: "150" },
    { name: "Milk", unit: "litre", quantityOnHand: "30", minThreshold: "10", costPerUnit: "55" },
    { name: "Bread", unit: "packets", quantityOnHand: "3", minThreshold: "5", costPerUnit: "40" },
    { name: "Eggs", unit: "dozen", quantityOnHand: "4", minThreshold: "6", costPerUnit: "80" },
    { name: "Tea Leaves", unit: "kg", quantityOnHand: "5", minThreshold: "2", costPerUnit: "400" },
    { name: "Coffee Powder", unit: "kg", quantityOnHand: "4", minThreshold: "2", costPerUnit: "600" },
    { name: "Sugar", unit: "kg", quantityOnHand: "20", minThreshold: "5", costPerUnit: "45" },
    { name: "Lentils (Dal)", unit: "kg", quantityOnHand: "18", minThreshold: "6", costPerUnit: "110" },
  ];

  const insertedInventory: Record<string, string> = {};
  for (const i of inventoryData) {
    const [row] = await db
      .insert(inventoryItems)
      .values(i)
      .onConflictDoUpdate({ target: inventoryItems.name, set: { unit: i.unit } })
      .returning();
    insertedInventory[i.name] = row.id;
  }

  // Menu items
  const menuData = [
    {
      name: "Masala Dosa",
      category: "Breakfast",
      description: "Crispy rice crepe filled with spiced potato masala, served with sambar & chutney.",
      price: "70.00",
      imageUrl: "/images/menu-masala-dosa.jpg",
      isVeg: true,
      prepTimeMinutes: 12,
      isFeatured: true,
      recipe: [["Rice", 0.15], ["Potatoes", 0.2], ["Cooking Oil", 0.02]],
    },
    {
      name: "Vegetable Poha",
      category: "Breakfast",
      description: "Flattened rice tossed with peanuts, curry leaves and fresh vegetables.",
      price: "45.00",
      imageUrl: "/images/menu-poha.jpg",
      isVeg: true,
      prepTimeMinutes: 8,
      recipe: [["Onions", 0.05], ["Cooking Oil", 0.01]],
    },
    {
      name: "Bread Omelette",
      category: "Breakfast",
      description: "Toasted bread with a fluffy double-egg omelette and a dash of pepper.",
      price: "55.00",
      imageUrl: "/images/menu-bread-omelette.jpg",
      isVeg: false,
      prepTimeMinutes: 10,
      recipe: [["Bread", 0.2], ["Eggs", 0.2], ["Cooking Oil", 0.01]],
    },
    {
      name: "Paneer Butter Masala",
      category: "Main Course",
      description: "Rich tomato & cashew gravy simmered with soft paneer cubes, served with rice or roti.",
      price: "130.00",
      imageUrl: "/images/menu-paneer-butter-masala.jpg",
      isVeg: true,
      prepTimeMinutes: 18,
      isFeatured: true,
      isSpecialToday: true,
      recipe: [["Paneer", 0.15], ["Tomatoes", 0.15], ["Onions", 0.1], ["Cooking Oil", 0.03]],
    },
    {
      name: "Veg Thali",
      category: "Main Course",
      description: "Dal, sabzi, rice, 3 rotis, salad and pickle - a wholesome complete meal.",
      price: "110.00",
      imageUrl: "/images/menu-veg-thali.jpg",
      isVeg: true,
      prepTimeMinutes: 15,
      isFeatured: true,
      recipe: [["Rice", 0.15], ["Wheat Flour", 0.15], ["Lentils (Dal)", 0.1], ["Potatoes", 0.1]],
    },
    {
      name: "Chicken Curry with Rice",
      category: "Main Course",
      description: "Home-style chicken curry slow cooked with onions and spices, served with steamed rice.",
      price: "150.00",
      imageUrl: "/images/menu-chicken-curry.jpg",
      isVeg: false,
      prepTimeMinutes: 25,
      isSpecialToday: true,
      recipe: [["Chicken", 0.25], ["Onions", 0.1], ["Tomatoes", 0.1], ["Rice", 0.15]],
    },
    {
      name: "Samosa (2 pcs)",
      category: "Snacks",
      description: "Crispy golden pastry stuffed with spiced potato filling. Served with mint chutney.",
      price: "30.00",
      imageUrl: "/images/menu-samosa.jpg",
      isVeg: true,
      prepTimeMinutes: 6,
      isFeatured: true,
      recipe: [["Wheat Flour", 0.08], ["Potatoes", 0.1], ["Cooking Oil", 0.05]],
    },
    {
      name: "Veg Sandwich",
      category: "Snacks",
      description: "Grilled sandwich loaded with fresh vegetables and mint chutney.",
      price: "50.00",
      imageUrl: "/images/menu-sandwich.jpg",
      isVeg: true,
      prepTimeMinutes: 8,
      recipe: [["Bread", 0.3], ["Onions", 0.03], ["Tomatoes", 0.05]],
    },
    {
      name: "Chicken Puff",
      category: "Snacks",
      description: "Flaky puff pastry filled with a spicy minced chicken filling.",
      price: "40.00",
      imageUrl: "/images/menu-chicken-puff.jpg",
      isVeg: false,
      prepTimeMinutes: 6,
      recipe: [["Chicken", 0.05], ["Wheat Flour", 0.05]],
    },
    {
      name: "Masala Chai",
      category: "Beverages",
      description: "Freshly brewed spiced tea with milk - the perfect study break companion.",
      price: "20.00",
      imageUrl: "/images/menu-chai.jpg",
      isVeg: true,
      prepTimeMinutes: 5,
      isFeatured: true,
      recipe: [["Tea Leaves", 0.01], ["Milk", 0.1], ["Sugar", 0.01]],
    },
    {
      name: "Filter Coffee",
      category: "Beverages",
      description: "Strong South Indian filter coffee served frothy and hot.",
      price: "25.00",
      imageUrl: "/images/menu-coffee.jpg",
      isVeg: true,
      prepTimeMinutes: 5,
      recipe: [["Coffee Powder", 0.015], ["Milk", 0.1], ["Sugar", 0.01]],
    },
    {
      name: "Fresh Lime Soda",
      category: "Beverages",
      description: "Zesty lime soda, sweet or salted, served chilled.",
      price: "35.00",
      imageUrl: "/images/menu-lime-soda.jpg",
      isVeg: true,
      prepTimeMinutes: 4,
      recipe: [["Sugar", 0.02]],
    },
    {
      name: "Gulab Jamun (2 pcs)",
      category: "Desserts",
      description: "Soft milk-solid dumplings soaked in rose flavoured sugar syrup.",
      price: "40.00",
      imageUrl: "/images/menu-gulab-jamun.jpg",
      isVeg: true,
      prepTimeMinutes: 5,
      recipe: [["Milk", 0.05], ["Sugar", 0.08]],
    },
    {
      name: "Chocolate Brownie",
      category: "Desserts",
      description: "Fudgy chocolate brownie served warm, a student favourite.",
      price: "60.00",
      imageUrl: "/images/menu-brownie.jpg",
      isVeg: true,
      prepTimeMinutes: 5,
      isFeatured: true,
      recipe: [["Wheat Flour", 0.06], ["Sugar", 0.05], ["Eggs", 0.1]],
    },
  ];

  for (const item of menuData) {
    const [row] = await db
      .insert(menuItems)
      .values({
        categoryId: insertedCategories[item.category],
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg,
        prepTimeMinutes: item.prepTimeMinutes,
        isFeatured: item.isFeatured ?? false,
        isSpecialToday: item.isSpecialToday ?? false,
      })
      .onConflictDoNothing()
      .returning();

    if (row) {
      for (const [ingredientName, qty] of item.recipe as [string, number][]) {
        const inventoryItemId = insertedInventory[ingredientName];
        if (!inventoryItemId) continue;
        await db
          .insert(recipes)
          .values({ menuItemId: row.id, inventoryItemId, quantityRequired: String(qty) })
          .onConflictDoNothing();
      }
    }
  }

  // Canteen settings
  await db
    .insert(canteenSettings)
    .values([
      { key: "canteen_name", value: { value: "Canteen Co." } },
      { key: "opening_hours", value: { open: "08:00", close: "20:00" } },
      { key: "tax_rate", value: { value: 0.05 } },
      { key: "allow_cancellation_within_minutes", value: { value: 5 } },
      { key: "pickup_slot_interval_minutes", value: { value: 10 } },
    ])
    .onConflictDoNothing();

  console.log("Seed complete!");
  console.log("Demo logins:");
  for (const u of demoUsers) console.log(`  ${u.role.padEnd(8)} -> ${u.email} / ${u.password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
