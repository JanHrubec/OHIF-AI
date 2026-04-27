#!/usr/bin/env bash
set -euo pipefail

export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-0}"
export COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"
export COMPOSE_HTTP_TIMEOUT="${COMPOSE_HTTP_TIMEOUT:-1800}"
export PERSIST_ROOT="${PERSIST_ROOT:-/mnt/checkpoints/ohif-ai}"

compose="docker compose -f ./docker-compose.yml -f ./docker-compose.localhost.yml"
CLEAN_BUILD_ARTIFACTS="${CLEAN_BUILD_ARTIFACTS:-1}"
START_CLEAN="${START_CLEAN:-1}"

image_exists() {
	docker image inspect "$1" >/dev/null 2>&1
}

have_cached_app_images() {
	image_exists "webapp:latest" && image_exists "monai:latest"
}

cleanup_build_artifacts() {
	if [[ "$CLEAN_BUILD_ARTIFACTS" != "1" ]]; then
		return 0
	fi
	echo "==> Pruning dangling build artifacts"
	docker image prune -f >/dev/null 2>&1 || true
	docker builder prune -af >/dev/null 2>&1 || true
}

clean_stale() {
	if [[ "$START_CLEAN" != "1" ]]; then
		return 0
	fi
	echo "==> Cleaning stale containers"
	$compose down --remove-orphans || true
}

echo "==> Preparing persistent storage ${PERSIST_ROOT}"
mkdir -p \
	"${PERSIST_ROOT}/ohif/nginx-logs" \
	"${PERSIST_ROOT}/orthanc/db" \
	"${PERSIST_ROOT}/monai/predictions" \
	"${PERSIST_ROOT}/monai/checkpoints" \
	"${PERSIST_ROOT}/monai/cache" \
	"${PERSIST_ROOT}/monai/apps"

echo "==> Validating compose"
$compose config >/dev/null

if [[ "${FORCE_BUILD:-0}" != "1" ]]; then
	if have_cached_app_images; then
		clean_stale
		echo "==> Images found; starting without rebuild"
		$compose up -d --no-build --remove-orphans
		echo
		echo "==> Localhost viewer URLs:"
		echo "    http://localhost:18080/"
		echo "    http://localhost:18080/ohif/"
		echo "==> Local APIs:"
		echo "    MONAI:   http://localhost:18002/monai/info/"
		echo "    Orthanc: http://localhost:18042/"
		exit 0
	fi
	echo "No cached images found and FORCE_BUILD not set."
	echo "Use: FORCE_BUILD=1 ./start-localhost.sh"
	exit 2
fi

$compose pull orthanc

docker pull nvidia/cuda:12.1.1-devel-ubuntu22.04 || true

cleanup_build_artifacts

REBUILD_ALL="${REBUILD_ALL:-0}"

if [[ "$REBUILD_ALL" == "1" ]] || ! image_exists "webapp:latest"; then
	$compose build ohif_viewer
	cleanup_build_artifacts
else
	echo "==> skipping ohif_viewer build"
fi

if [[ "$REBUILD_ALL" == "1" ]] || ! image_exists "monai:latest"; then
	$compose build monai_sam2
	cleanup_build_artifacts
else
	echo "==> skipping monai_sam2 build"
fi

echo "==> Starting localhost services without rebuild"
clean_stale
$compose up -d --no-build --remove-orphans

echo
echo "==> Localhost viewer URLs:"
echo "    http://localhost:18080/"
echo "    http://localhost:18080/ohif/"
echo "==> Local APIs:"
echo "    MONAI:   http://localhost:18002/monai/info/"
echo "    Orthanc: http://localhost:18042/"
