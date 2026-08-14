import { CreateCategoryForm } from "@/components/forms/CreateCategoryForm";

export interface CategoryRow {
  name: string;
  type: string;
}

export function CategoriesPanel({
  entityId,
  categories,
}: {
  entityId: string;
  categories: CategoryRow[];
}) {
  return (
    <section className="panel">
      <h3>Categorías</h3>
      {categories.length === 0 ? (
        <p className="small-text">Sin categorías todavía.</p>
      ) : (
        <ul>
          {categories.map((category) => (
            <li key={`${category.name}-${category.type}`}>
              {category.name}{" "}
              <span className="small-text">
                ({category.type === "income" ? "ingreso" : "gasto"})
              </span>
            </li>
          ))}
        </ul>
      )}
      <CreateCategoryForm entityId={entityId} />
    </section>
  );
}