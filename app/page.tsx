import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-black/[.08] bg-white px-10 py-12 text-center shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        {session ? (
          <>
            <p className="text-2xl font-semibold text-black dark:text-zinc-50">
              Success!
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as {session.user?.email}
            </p>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="rounded-full border border-black/[.08] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
              >
                Log out
              </button>
            </form>
          </>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-3 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Sign in with Google
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
