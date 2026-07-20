import { Heart, ShoppingCart, Star } from "lucide-react";

interface ProductCardProps {
  image: string;
  name: string;
  category: string;
  price: string;
  rating: number;
}

const ProductCard = ({
  image,
  name,
  category,
  price,
  rating,
}: ProductCardProps) => {
  return (
    <div className="group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-2 hover:shadow-xl">
      <div className="relative">
        <img
          src={image}
          alt={name}
          className="h-72 w-full object-cover"
        />

        <button className="absolute right-4 top-4 rounded-full bg-white p-2 shadow">
          <Heart size={18} />
        </button>
      </div>

      <div className="space-y-3 p-6">
        <span className="text-sm text-amber-600">
          {category}
        </span>

        <h3 className="text-xl font-semibold">
          {name}
        </h3>

        <div className="flex items-center gap-2">
          <Star
            size={16}
            className="fill-yellow-400 text-yellow-400"
          />

          <span>{rating}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">
            {price}
          </span>

          <button className="rounded-xl bg-amber-500 p-3 text-white hover:bg-amber-600">
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;