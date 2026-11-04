import User from "./User";
import Household from "./Household";
import Membership from "./Membership";
import Invitation from "./Invitation";
import Category from "./Category";
import Product from "./Product";
import StockMovement from "./StockMovement";
import ShoppingItem from "./ShoppingItem";
import AuthRateLimit from "./AuthRateLimit";

export { User, Household, Membership, Invitation, Category, Product, StockMovement, ShoppingItem };

// Explicit initialization is needed before transactions and when autoIndex is disabled.
export async function initializeDatabase() {
  for (const schemaModel of [User, Household, Membership, Invitation, Category, Product, StockMovement, ShoppingItem, AuthRateLimit]) {
    await schemaModel.createCollection();
    await schemaModel.createIndexes();
  }
}
