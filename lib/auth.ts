import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { getServerSession } from "next-auth";
import { cache } from "react";
import { findOrCreateWorkspace, addWorkspaceMember } from "./db/workspaces";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user repo read:org",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token!;
        token.githubId = String((profile as Record<string, unknown>).id);
        token.githubUsername = (profile as Record<string, unknown>).login as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.githubId = token.githubId;
      session.user.githubUsername = token.githubUsername;
      return session;
    },
    async signIn({ profile }) {
      if (!profile) return true;
      const username = (profile as Record<string, unknown>).login as string;
      const id = String((profile as Record<string, unknown>).id);
      const workspace = findOrCreateWorkspace(username);
      addWorkspaceMember(workspace.id, id, "admin");
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const getSession = cache(() => getServerSession(authOptions));

export async function getRequiredSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
