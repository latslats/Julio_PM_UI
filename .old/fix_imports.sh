#!/usr/bin/env bash

# Fix the relative imports for lib/utils
find frontend/src/components -name "*.jsx" -exec sed -i '' 's|import { cn } from "@/lib/utils"|import { cn } from "../../lib/utils"|g' {} \;

# Fix the main component causing the issue
sed -i '' 's|import { cn } from "@/lib/utils"|import { cn } from "../lib/utils"|g' frontend/src/pages/*.jsx

# Make sure we rebuild the frontend container to apply changes
docker-compose down
docker-compose up -d --build 