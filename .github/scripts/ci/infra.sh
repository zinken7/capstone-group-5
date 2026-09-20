#!/usr/bin/env bash
set -euo pipefail

has_terraform=false
while IFS= read -r -d '' file; do
  case "$file" in
    *.tf|*.tf.json) has_terraform=true ;;
  esac
done < <(git ls-files -z infra)

if [[ "$has_terraform" == true ]]; then
  terraform fmt -check -recursive infra
  # Every directory containing Terraform configuration is validated, including
  # reusable modules. init does not access remote state or apply infrastructure.
  while IFS= read -r dir; do
    terraform -chdir="$dir" init -backend=false -input=false
    terraform -chdir="$dir" validate -no-color
  done < <(git ls-files infra | sed -nE '/\.tf(\.json)?$/s|/[^/]*$||p' | sort -u)
fi

if [[ -f infra/ci.sh ]]; then
  bash infra/ci.sh
else
  while IFS= read -r -d '' file; do
    case "$file" in
      *.md|*.mdx|*.rst|*/.gitkeep) continue ;;
      *.tf|*.tf.json) continue ;;
      *.tfvars|*.tfvars.json|*/.terraform.lock.hcl)
        if [[ "$has_terraform" == true ]]; then continue; fi ;;
    esac
    echo 'Infrastructure has no validator. Add Terraform configuration or infra/ci.sh.' >&2
    exit 1
  done < <(git ls-files -z infra)
  if [[ "$has_terraform" == false ]]; then
    echo 'No infrastructure configuration exists yet; infra/ contains documentation only.'
  fi
fi
