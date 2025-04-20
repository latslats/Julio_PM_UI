#!/usr/bin/env bash

# Fix the ui component imports
for file in $(find frontend/src/components/ui -name "*.jsx"); do
    sed -i '' 's|import { cn } from "@/lib/utils"|import { cn } from "../../lib/utils"|g' "$file"
done

# Fix imports in other components directories
for file in $(find frontend/src/components/* -type d -not -path "*/ui" 2>/dev/null); do
    for jsxfile in $(find "$file" -name "*.jsx"); do
        sed -i '' 's|import { cn } from "@/lib/utils"|import { cn } from "../../lib/utils"|g' "$jsxfile"
    done
done

# Fix imports in pages
for file in $(find frontend/src/pages -name "*.jsx"); do
    sed -i '' 's|import { cn } from "@/lib/utils"|import { cn } from "../lib/utils"|g' "$file"
done

# Build with no cache to ensure all changes are applied
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d 