import { Handlers, PageProps } from "$fresh/server.ts";
import { requireAuth } from "../utils/session.ts";
import { Role } from "../utils/roles.ts";

export interface Product {
  idProduct: string;
  productName: string;
  category: string;
  sellingPrice: number;
  quantity: number;
  isPromotional: boolean;
  upc: string;
  categoryNumber: number;
  characteristics: string;
  manufacturer: string;
}

export const handler: Handlers<{ role: Role; products: Product[] }> = {
  async GET(req, ctx) {
    return await requireAuth(req, ctx, async () => {
      return await ctx.render({
        role: ctx.state.role as Role,
        products: [],
      });
    });
  },
};

export default function Products(
  {}: PageProps<{ role: Role; products: Product[] }>,
) {
  return (
    <div>
      <h1>Products (Server-Side Placeholder)</h1>
      {}
    </div>
  );
}
