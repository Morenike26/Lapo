-include .env

ARC_RPC_URL ?= https://rpc.testnet.arc.network

# ─── Contracts ───────────────────────────────────────────────────────────────

build:
	cd contracts && forge build

test:
	cd contracts && forge test -vv

fmt:
	cd contracts && forge fmt

clean:
	cd contracts && forge clean

# ─── Deployment ──────────────────────────────────────────────────────────────

deploy-dry:
	cd contracts && ARC_RPC_URL=$(ARC_RPC_URL) PRIVATE_KEY=$(PRIVATE_KEY) \
		forge script script/Deploy.s.sol --rpc-url $(ARC_RPC_URL) -vvvv

deploy:
	cd contracts && ARC_RPC_URL=$(ARC_RPC_URL) PRIVATE_KEY=$(PRIVATE_KEY) \
		forge script script/Deploy.s.sol --rpc-url $(ARC_RPC_URL) --broadcast -vvvv

# ─── Frontend ────────────────────────────────────────────────────────────────

install:
	npm install

dev:
	npm run dev

build-frontend:
	npm run build

.PHONY: build test fmt clean deploy-dry deploy install dev build-frontend
