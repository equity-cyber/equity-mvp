export interface GitHubData {
  username: string
  repos: number
  total_stars: number
  account_created: string
}

export async function fetchGitHubData(providerToken: string): Promise<GitHubData | null> {
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${providerToken}` },
    })
    if (!userRes.ok) return null
    const user = await userRes.json()

    const reposRes = await fetch(
      `https://api.github.com/users/${user.login}/repos?per_page=100&sort=stars`,
      { headers: { Authorization: `token ${providerToken}` } }
    )
    const repos = reposRes.ok ? await reposRes.json() : []

    const total_stars = Array.isArray(repos)
      ? repos.reduce((sum: number, r: any) => sum + (r.stargazers_count || 0), 0)
      : 0

    return {
      username: user.login,
      repos: user.public_repos || 0,
      total_stars,
      account_created: new Date(user.created_at).getFullYear().toString(),
    }
  } catch {
    return null
  }
}
