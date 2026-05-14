/**
 * TechIcon — tiny ecosystem/platform glyph using simple-icons paths.
 *
 * Each entry maps the key the bundle emits (lowercased) to a Simple Icon
 * object. Named imports from `simple-icons` are tree-shakeable under Vite,
 * so only the icons we reference end up in the bundle. Unknown keys
 * render a neutral dot so the layout never breaks.
 */
// NOTE: `simple-icons` v16 removed several proprietary brand marks (Amazon/AWS,
// Microsoft/Azure, Oracle/Java) over trademark concerns. We use `siOpenjdk`
// for Java; AWS / Azure fall through to the neutral dot fallback.
import {
  siAngular,
  siCircleci,
  siDart,
  siDocker,
  siFlutter,
  siGit,
  siGithub,
  siGithubactions,
  siGitlab,
  siGo,
  siGooglecloud,
  siJavascript,
  siKotlin,
  siKubernetes,
  siNextdotjs,
  siNodedotjs,
  siOpenjdk,
  siPhp,
  siPostgresql,
  siPython,
  siReact,
  siRedis,
  siRubyonrails,
  siRuby,
  siRust,
  siSwift,
  siTerraform,
  siTypescript,
  siVuedotjs,
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";

const ICONS: Record<string, SimpleIcon> = {
  // ── languages / runtimes ────────────────────────────────────────────────
  node:        siNodedotjs,
  nodejs:      siNodedotjs,
  python:      siPython,
  ruby:        siRuby,
  rails:       siRubyonrails,
  go:          siGo,
  golang:      siGo,
  java:        siOpenjdk,
  jdk:         siOpenjdk,
  openjdk:     siOpenjdk,
  kotlin:      siKotlin,
  rust:        siRust,
  php:         siPhp,
  swift:       siSwift,
  dart:        siDart,
  typescript:  siTypescript,
  javascript:  siJavascript,

  // ── frameworks ───────────────────────────────────────────────────────────
  react:       siReact,
  vue:         siVuedotjs,
  angular:     siAngular,
  next:        siNextdotjs,
  nextjs:      siNextdotjs,
  flutter:     siFlutter,

  // ── platforms / infra ────────────────────────────────────────────────────
  github:      siGithub,
  gitlab:      siGitlab,
  docker:      siDocker,
  kubernetes:  siKubernetes,
  k8s:         siKubernetes,
  terraform:   siTerraform,
  cloud_infra: siTerraform,
  // AWS / Azure intentionally fall through to the neutral dot — simple-icons
  // v16 dropped them. GCP keeps its icon since `siGooglecloud` is still there.
  gcp:         siGooglecloud,
  ci_cd:       siGithubactions,
  circleci:    siCircleci,

  // ── stores ───────────────────────────────────────────────────────────────
  postgresql:  siPostgresql,
  postgres:    siPostgresql,
  redis:       siRedis,

  // ── generic fallback ─────────────────────────────────────────────────────
  git:         siGit,
};

interface Props {
  /** Lower-case ecosystem/platform key as emitted by the bundle. */
  name: string;
  size?: number;
  className?: string;
}

export function TechIcon({ name, size = 14, className = "" }: Props) {
  const icon = ICONS[name.toLowerCase()];
  if (!icon) {
    // Unknown tech — neutral filled circle so the row stays aligned.
    return (
      <span
        className={`inline-block rounded-full bg-slate-400 dark:bg-slate-500 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
  return (
    <svg
      role="img"
      aria-label={icon.title}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={`#${icon.hex}`}
      className={`inline-block shrink-0 ${className}`}
    >
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}
