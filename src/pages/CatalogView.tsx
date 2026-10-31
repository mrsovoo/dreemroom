import React from "react";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { renderCategoryIcon } from "../components/categoryIcon";
import type { Product } from "../data";
import { allCategory } from "../data";

type CatalogViewProps = {
  category: string;
  setCategory: (cat: string) => void;
  dynamicCategories: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: "default" | "popular" | "price-asc" | "price-desc";
  setSortBy: (sort: "default" | "popular" | "price-asc" | "price-desc") => void;
  catalogProducts: Product[];
  openProduct: (product: Product) => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
};

export default function CatalogView({
  category,
  setCategory,
  dynamicCategories,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  catalogProducts,
  openProduct,
  wishlist,
  toggleWishlist,
}: CatalogViewProps) {
  return (
    <section className="section catalog">
      <div className="catalog-head-block">
        <div className="catalog-title-wrap">
          <h1 className="catalog-title">
            {category === allCategory ? "Katalog" : category}
          </h1>
          <p className="catalog-count">{catalogProducts.length} ta model</p>
        </div>
        <div className="catalog-toolbar">
          <div className="search-field catalog-search-pill">
            <Search size={18} className="catalog-search-icon" />
            <input
              type="text"
              placeholder="Qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Tozalash"
                className="catalog-search-clear"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className="catalog-filter-circle" title="Saralash va filtr">
            <SlidersHorizontal size={18} />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "default" | "popular" | "price-asc" | "price-desc",
                )
              }
              aria-label="Saralash"
              className="catalog-filter-select"
            >
              <option value="default">Standart saralash</option>
              <option value="popular">Ommabop (Eng ko'p sotilganlar)</option>
              <option value="price-asc">Narx: Arzondan qimmatga</option>
              <option value="price-desc">Narx: Qimmatdan arzonga</option>
            </select>
          </div>
        </div>
      </div>

      <div className="catalog-chips-row" aria-label="Kategoriyalar">
        {dynamicCategories.map((item) => {
          const icon = renderCategoryIcon(item);
          return (
            <button
              key={item}
              type="button"
              className={category === item ? "catalog-chip is-active" : "catalog-chip"}
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              {icon && <span className="catalog-chip-icon">{icon}</span>}
              <span className="catalog-chip-label">{item}</span>
            </button>
          );
        })}
      </div>

      {catalogProducts.length ? (
        <div className="grid">
          {catalogProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={openProduct}
              isLiked={wishlist.includes(product.id)}
              onToggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>Ushbu bo'limda yoki qidiruv bo'yicha model topilmadi.</p>
          <button
            className="btn"
            onClick={() => {
              setCategory(allCategory);
              setSearchQuery("");
            }}
          >
            Barcha mahsulotlar
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </section>
  );
}
