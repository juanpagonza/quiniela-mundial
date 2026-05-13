// Placeholder home — Task 4.6 builds the real dashboard (próximo partido,
// mini-leaderboard, contador de predicciones pendientes).
export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Bienvenido
        </p>
        <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
          La quiniela arranca pronto.
        </h1>
      </div>
      <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
        Esto es la base. En las próximas tareas se construyen las pantallas
        de partidos, predicciones, tabla en tiempo real y panel de admin.
        Por ahora podés navegar el menú para ver el shell.
      </p>
    </div>
  )
}
