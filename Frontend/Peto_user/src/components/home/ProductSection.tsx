import ProductCard from "./ProductCard";
import SectionTitle from "./SectionTitle";

import dogFood from "../../assets/hero.png";
import catToy from "../../assets/hero.png";
import leash from "../../assets/hero.png";

const ProductSection = () => {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <SectionTitle
        title="Curated Collections"
        subtitle="Everything your furry friend needs."
      />

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        <ProductCard
          image={dogFood}
          name="Premium Dog Food"
          category="Nutrition"
          price="$49"
          rating={4.9}
        />

        <ProductCard
          image={catToy}
          name="Interactive Cat Toy"
          category="Toys"
          price="$29"
          rating={4.8}
        />

        <ProductCard
          image={leash}
          name="Luxury Pet Leash"
          category="Accessories"
          price="$35"
          rating={5.0}
        />
      </div>
    </section>
  );
};

export default ProductSection;