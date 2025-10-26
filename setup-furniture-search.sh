#!/bin/bash

# Quick Start Script for Furniture Search System
# This script helps set up and run the complete system

set -e

echo "🏠 Interior Design - Furniture Search Setup"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "artspace-interior" ] || [ ! -d "taste-fingerprint" ]; then
    echo "❌ Please run this script from the project root directory (calhacks12)"
    exit 1
fi

echo -e "${YELLOW}Step 1: Backend Setup${NC}"
echo "----------------------"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.10+"
    exit 1
fi

echo "✓ Python 3 found"

# Check if virtual environment exists
cd taste-fingerprint/apps/serve

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Check .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from credentials..."
    cat > .env << EOL
CHROMA_API_KEY=ck-5yuJR9tQsoMELDLbQdnUyGKgzkbWXkm2sGUpLwnbtdxE
CHROMA_TENANT=b7a5f264-9400-420e-96f1-b3dd6638f24b
CHROMA_DATABASE=taste-fingerprint
CORS_ALLOW_ORIGINS=http://localhost:3000,http://152.42.97.192:3000,*
EOL
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo "✓ .env file exists"
fi

cd ../../..

echo ""
echo -e "${YELLOW}Step 2: Frontend Setup${NC}"
echo "----------------------"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+"
    exit 1
fi

echo "✓ Node.js found ($(node --version))"

cd artspace-interior/artspace-ui

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo "✓ Node modules exist"
fi

# Check .env.local file
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cat > .env.local << EOL
NEXT_PUBLIC_FURNITURE_API_URL=http://localhost:8000
NEXT_PUBLIC_NERF_API_URL=http://localhost:5000
EOL
    echo -e "${GREEN}✓ .env.local file created${NC}"
else
    echo "✓ .env.local file exists"
fi

cd ../..

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "==========================================="
echo "🚀 To start the system, run these commands in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd taste-fingerprint/apps/serve"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --reload --port 8000"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd artspace-interior/artspace-ui"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo "==========================================="
echo ""
echo "📚 For more information, see FURNITURE_SEARCH_README.md"
