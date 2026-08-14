"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { SignOutButton } from "@/components/dashboard/SignOutButton";

interface EntityOption {
  _id: string;
  name: string;
  type: "personal" | "business";
}

interface NavItem {
  href: string;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function AppShell({
  userName,
  entities,
  children,
}: {
  userName: string;
  entities: EntityOption[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const businessMatch = pathname.match(/^\/business\/([^/]+)/);
  const businessId = businessMatch?.[1];
  const isBusiness = Boolean(businessId);
  const base = isBusiness ? `/business/${businessId}` : "/personal";

  const groups: NavGroup[] = isBusiness
    ? [
        {
          title: "Resumen",
          items: [{ href: base, label: "Resumen del negocio" }],
        },
        {
          title: "Operación",
          items: [
            { href: `${base}/pos`, label: "Punto de venta" },
            { href: `${base}/inventario`, label: "Inventario" },
            { href: `${base}/ventas`, label: "Ventas y clientes" },
          ],
        },
        {
          title: "Finanzas",
          items: [
            { href: `${base}/cuentas`, label: "Cuentas y movimientos" },
            { href: `${base}/creditos`, label: "Créditos" },
          ],
        },
      ]
    : [
        {
          title: "Resumen",
          items: [{ href: "/personal", label: "Mi resumen" }],
        },
        {
          title: "Finanzas",
          items: [
            { href: "/personal/cuentas", label: "Cuentas y movimientos" },
            { href: "/personal/creditos", label: "Créditos" },
            { href: "/personal/negocios", label: "Negocios" },
          ],
        },
        {
          title: "Configuración",
          items: [
            { href: "/personal/configuracion", label: "Categorías y tipos de cambio" },
          ],
        },
      ];

  const isActive = (href: string) =>
    href === base ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const personalEntity = entities.find((entity) => entity.type === "personal");
  const businesses = entities.filter((entity) => entity.type === "business");
  const currentEntityId = isBusiness
    ? businessId
    : personalEntity?._id ?? "";

  function handleEntityChange(value: string) {
    router.push(value === personalEntity?._id ? "/personal" : `/business/${value}`);
  }

  const renderLinks = (className: (active: boolean) => string) =>
    groups.map((group) => (
      <div key={group.title} className="sidebar-group">
        <div className="sidebar-group-title">{group.title}</div>
        {group.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={className(isActive(item.href))}
          >
            {item.label}
          </Link>
        ))}
      </div>
    ));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Finanzas FP</div>
        <div className="sidebar-entity">
          <select
            value={currentEntityId}
            onChange={(e) => handleEntityChange(e.target.value)}
            aria-label="Cambiar de entidad"
          >
            {personalEntity ? (
              <option value={personalEntity._id}>
                {personalEntity.name} (Personal)
              </option>
            ) : null}
            {businesses.map((business) => (
              <option key={business._id} value={business._id}>
                {business.name} (Negocio)
              </option>
            ))}
          </select>
        </div>
        <nav className="sidebar-nav">
          {renderLinks((active) => `sidebar-link${active ? " active" : ""}`)}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user small-text">{userName}</div>
          <SignOutButton />
        </div>
      </aside>

      <nav className="mobile-nav">
        <select
          value={currentEntityId}
          onChange={(e) => handleEntityChange(e.target.value)}
          aria-label="Cambiar de entidad"
        >
          {personalEntity ? (
            <option value={personalEntity._id}>
              {personalEntity.name}
            </option>
          ) : null}
          {businesses.map((business) => (
            <option key={business._id} value={business._id}>
              {business.name}
            </option>
          ))}
        </select>
        {groups.flatMap((group) =>
          group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : ""}
            >
              {item.label}
            </Link>
          )),
        )}
      </nav>

      <main className="content">{children}</main>
    </div>
  );
}