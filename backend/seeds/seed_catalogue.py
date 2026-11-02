"""
Comprehensive starter catalogue seed.
Provides realistic product templates for all 30 supported business categories.
These are TEMPLATES only — they do NOT create stock or set prices.
"""
from sqlalchemy.orm import Session
from sqlalchemy import select

from models.catalogue_models import CatalogueCategory, CatalogueSubcategory, CatalogueItem


# ─── Catalogue Data ────────────────────────────────────────────────────────────

CATALOGUE_DATA = {
    "hotel_restaurant": {
        "display_name": "Hotel & Restaurant",
        "categories": [
            {
                "name": "Breakfast",
                "subcategories": ["South Indian Breakfast", "North Indian Breakfast", "Continental"],
                "items": [
                    {"name": "Idli (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "idli,south indian,breakfast"},
                    {"name": "Idli (4 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "idli,south indian,breakfast"},
                    {"name": "Mini Idli", "unit": "Plate", "is_vegetarian": True, "tags": "mini idli,south indian"},
                    {"name": "Sambar Idli", "unit": "Plate", "is_vegetarian": True, "tags": "sambar idli,south indian"},
                    {"name": "Plain Dosa", "unit": "Plate", "is_vegetarian": True, "tags": "dosa,south indian,breakfast"},
                    {"name": "Masala Dosa", "unit": "Plate", "is_vegetarian": True, "tags": "masala dosa,south indian"},
                    {"name": "Ghee Masala Dosa", "unit": "Plate", "is_vegetarian": True, "tags": "ghee dosa,south indian"},
                    {"name": "Rava Dosa", "unit": "Plate", "is_vegetarian": True, "tags": "rava dosa,south indian"},
                    {"name": "Onion Rava Dosa", "unit": "Plate", "is_vegetarian": True, "tags": "onion rava dosa"},
                    {"name": "Set Dosa (3 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "set dosa,south indian"},
                    {"name": "Paper Dosa", "unit": "Plate", "is_vegetarian": True, "tags": "paper dosa"},
                    {"name": "Uttapam (Plain)", "unit": "Plate", "is_vegetarian": True, "tags": "uttapam,south indian"},
                    {"name": "Onion Uttapam", "unit": "Plate", "is_vegetarian": True, "tags": "onion uttapam"},
                    {"name": "Tomato Uttapam", "unit": "Plate", "is_vegetarian": True, "tags": "tomato uttapam"},
                    {"name": "Mixed Veg Uttapam", "unit": "Plate", "is_vegetarian": True, "tags": "veg uttapam"},
                    {"name": "Pongal", "unit": "Plate", "is_vegetarian": True, "tags": "pongal,ven pongal,south indian"},
                    {"name": "Ven Pongal", "unit": "Plate", "is_vegetarian": True, "tags": "ven pongal"},
                    {"name": "Poori (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "poori,north indian"},
                    {"name": "Poori Masala", "unit": "Plate", "is_vegetarian": True, "tags": "poori masala"},
                    {"name": "Chapati (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "chapati,roti"},
                    {"name": "Paratha (Plain)", "unit": "Plate", "is_vegetarian": True, "tags": "paratha"},
                    {"name": "Aloo Paratha", "unit": "Plate", "is_vegetarian": True, "tags": "aloo paratha"},
                    {"name": "Upma", "unit": "Plate", "is_vegetarian": True, "tags": "upma,south indian,breakfast"},
                    {"name": "Poha", "unit": "Plate", "is_vegetarian": True, "tags": "poha,breakfast"},
                    {"name": "Vada (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "vada,medu vada"},
                    {"name": "Sambar Vada", "unit": "Plate", "is_vegetarian": True, "tags": "sambar vada"},
                    {"name": "Curd Vada", "unit": "Plate", "is_vegetarian": True, "tags": "curd vada"},
                    {"name": "Bread Toast", "unit": "Plate", "is_vegetarian": True, "tags": "bread toast,continental"},
                    {"name": "Bread Omelette", "unit": "Plate", "is_vegetarian": False, "tags": "bread omelette,egg"},
                    {"name": "Boiled Eggs (2 pcs)", "unit": "Plate", "is_vegetarian": False, "tags": "boiled egg"},
                ]
            },
            {
                "name": "South Indian Meals",
                "subcategories": ["Lunch Meals", "Dinner Meals"],
                "items": [
                    {"name": "Mini Meals (Veg)", "unit": "Plate", "is_vegetarian": True, "tags": "mini meals,south indian lunch"},
                    {"name": "Full Meals (Veg)", "unit": "Plate", "is_vegetarian": True, "tags": "full meals,south indian lunch"},
                    {"name": "Special Meals (Veg)", "unit": "Plate", "is_vegetarian": True, "tags": "special meals"},
                    {"name": "Non-Veg Meals", "unit": "Plate", "is_vegetarian": False, "tags": "non veg meals"},
                    {"name": "Fish Meals", "unit": "Plate", "is_vegetarian": False, "tags": "fish meals,south indian"},
                    {"name": "Chicken Meals", "unit": "Plate", "is_vegetarian": False, "tags": "chicken meals"},
                    {"name": "Sambar Rice", "unit": "Plate", "is_vegetarian": True, "tags": "sambar rice"},
                    {"name": "Rasam Rice", "unit": "Plate", "is_vegetarian": True, "tags": "rasam rice"},
                    {"name": "Curd Rice", "unit": "Plate", "is_vegetarian": True, "tags": "curd rice,thayir sadam"},
                    {"name": "Papad (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "papad,appalam"},
                ]
            },
            {
                "name": "Rice and Variety Rice",
                "subcategories": [],
                "items": [
                    {"name": "Plain Rice", "unit": "Plate", "is_vegetarian": True, "tags": "plain rice"},
                    {"name": "Jeera Rice", "unit": "Plate", "is_vegetarian": True, "tags": "jeera rice,cumin rice"},
                    {"name": "Lemon Rice", "unit": "Plate", "is_vegetarian": True, "tags": "lemon rice,variety rice"},
                    {"name": "Tomato Rice", "unit": "Plate", "is_vegetarian": True, "tags": "tomato rice"},
                    {"name": "Coconut Rice", "unit": "Plate", "is_vegetarian": True, "tags": "coconut rice"},
                    {"name": "Tamarind Rice (Puliyodharai)", "unit": "Plate", "is_vegetarian": True, "tags": "tamarind rice,puliyodharai"},
                    {"name": "Mint Rice", "unit": "Plate", "is_vegetarian": True, "tags": "mint rice"},
                    {"name": "Ghee Rice", "unit": "Plate", "is_vegetarian": True, "tags": "ghee rice"},
                    {"name": "Peas Pulao", "unit": "Plate", "is_vegetarian": True, "tags": "peas pulao"},
                    {"name": "Vegetable Pulao", "unit": "Plate", "is_vegetarian": True, "tags": "veg pulao"},
                ]
            },
            {
                "name": "Biryani",
                "subcategories": ["Veg Biryani", "Non-Veg Biryani"],
                "items": [
                    {"name": "Veg Biryani (Half)", "unit": "Plate", "is_vegetarian": True, "tags": "veg biryani"},
                    {"name": "Veg Biryani (Full)", "unit": "Plate", "is_vegetarian": True, "tags": "veg biryani"},
                    {"name": "Mushroom Biryani", "unit": "Plate", "is_vegetarian": True, "tags": "mushroom biryani"},
                    {"name": "Paneer Biryani", "unit": "Plate", "is_vegetarian": True, "tags": "paneer biryani"},
                    {"name": "Chicken Biryani (Half)", "unit": "Plate", "is_vegetarian": False, "tags": "chicken biryani"},
                    {"name": "Chicken Biryani (Full)", "unit": "Plate", "is_vegetarian": False, "tags": "chicken biryani"},
                    {"name": "Mutton Biryani (Half)", "unit": "Plate", "is_vegetarian": False, "tags": "mutton biryani"},
                    {"name": "Mutton Biryani (Full)", "unit": "Plate", "is_vegetarian": False, "tags": "mutton biryani"},
                    {"name": "Prawn Biryani", "unit": "Plate", "is_vegetarian": False, "tags": "prawn biryani,seafood biryani"},
                    {"name": "Fish Biryani", "unit": "Plate", "is_vegetarian": False, "tags": "fish biryani"},
                    {"name": "Egg Biryani", "unit": "Plate", "is_vegetarian": False, "tags": "egg biryani"},
                    {"name": "Family Biryani Pack", "unit": "Pack", "is_vegetarian": None, "tags": "family biryani,party pack"},
                ]
            },
            {
                "name": "Fried Rice and Noodles",
                "subcategories": [],
                "items": [
                    {"name": "Veg Fried Rice", "unit": "Plate", "is_vegetarian": True, "tags": "veg fried rice,chinese"},
                    {"name": "Egg Fried Rice", "unit": "Plate", "is_vegetarian": False, "tags": "egg fried rice"},
                    {"name": "Chicken Fried Rice", "unit": "Plate", "is_vegetarian": False, "tags": "chicken fried rice"},
                    {"name": "Prawn Fried Rice", "unit": "Plate", "is_vegetarian": False, "tags": "prawn fried rice"},
                    {"name": "Mushroom Fried Rice", "unit": "Plate", "is_vegetarian": True, "tags": "mushroom fried rice"},
                    {"name": "Veg Hakka Noodles", "unit": "Plate", "is_vegetarian": True, "tags": "veg noodles,hakka"},
                    {"name": "Egg Hakka Noodles", "unit": "Plate", "is_vegetarian": False, "tags": "egg noodles"},
                    {"name": "Chicken Hakka Noodles", "unit": "Plate", "is_vegetarian": False, "tags": "chicken noodles"},
                    {"name": "Prawn Hakka Noodles", "unit": "Plate", "is_vegetarian": False, "tags": "prawn noodles"},
                    {"name": "Schezwan Fried Rice", "unit": "Plate", "is_vegetarian": True, "tags": "schezwan rice,spicy"},
                    {"name": "Schezwan Noodles", "unit": "Plate", "is_vegetarian": True, "tags": "schezwan noodles"},
                ]
            },
            {
                "name": "Starters",
                "subcategories": ["Veg Starters", "Non-Veg Starters"],
                "items": [
                    {"name": "Gobi 65", "unit": "Plate", "is_vegetarian": True, "tags": "gobi 65,cauliflower,veg starter"},
                    {"name": "Mushroom 65", "unit": "Plate", "is_vegetarian": True, "tags": "mushroom 65,veg starter"},
                    {"name": "Paneer 65", "unit": "Plate", "is_vegetarian": True, "tags": "paneer 65,veg starter"},
                    {"name": "Veg Manchurian (Dry)", "unit": "Plate", "is_vegetarian": True, "tags": "veg manchurian"},
                    {"name": "Veg Manchurian (Gravy)", "unit": "Plate", "is_vegetarian": True, "tags": "veg manchurian gravy"},
                    {"name": "Spring Rolls (Veg)", "unit": "Plate", "is_vegetarian": True, "tags": "spring rolls"},
                    {"name": "Chicken 65", "unit": "Plate", "is_vegetarian": False, "tags": "chicken 65,starter"},
                    {"name": "Chicken Lollipop", "unit": "Plate", "is_vegetarian": False, "tags": "chicken lollipop"},
                    {"name": "Chicken Manchurian (Dry)", "unit": "Plate", "is_vegetarian": False, "tags": "chicken manchurian"},
                    {"name": "Chicken Tikka", "unit": "Plate", "is_vegetarian": False, "tags": "chicken tikka,tandoor"},
                    {"name": "Mutton Kebab", "unit": "Plate", "is_vegetarian": False, "tags": "mutton kebab"},
                    {"name": "Fish Fry", "unit": "Plate", "is_vegetarian": False, "tags": "fish fry,seafood"},
                    {"name": "Prawn Fry", "unit": "Plate", "is_vegetarian": False, "tags": "prawn fry,seafood"},
                    {"name": "Chilli Chicken (Dry)", "unit": "Plate", "is_vegetarian": False, "tags": "chilli chicken,indo chinese"},
                    {"name": "Chilli Chicken (Gravy)", "unit": "Plate", "is_vegetarian": False, "tags": "chilli chicken gravy"},
                ]
            },
            {
                "name": "North Indian",
                "subcategories": ["Curries", "Breads", "Dal"],
                "items": [
                    {"name": "Dal Tadka", "unit": "Bowl", "is_vegetarian": True, "tags": "dal tadka,north indian"},
                    {"name": "Dal Makhani", "unit": "Bowl", "is_vegetarian": True, "tags": "dal makhani"},
                    {"name": "Paneer Butter Masala", "unit": "Bowl", "is_vegetarian": True, "tags": "paneer butter masala"},
                    {"name": "Kadai Paneer", "unit": "Bowl", "is_vegetarian": True, "tags": "kadai paneer"},
                    {"name": "Palak Paneer", "unit": "Bowl", "is_vegetarian": True, "tags": "palak paneer,spinach"},
                    {"name": "Shahi Paneer", "unit": "Bowl", "is_vegetarian": True, "tags": "shahi paneer"},
                    {"name": "Matar Paneer", "unit": "Bowl", "is_vegetarian": True, "tags": "matar paneer"},
                    {"name": "Aloo Matar", "unit": "Bowl", "is_vegetarian": True, "tags": "aloo matar"},
                    {"name": "Mix Veg Curry", "unit": "Bowl", "is_vegetarian": True, "tags": "mix veg curry"},
                    {"name": "Butter Chicken", "unit": "Bowl", "is_vegetarian": False, "tags": "butter chicken"},
                    {"name": "Chicken Tikka Masala", "unit": "Bowl", "is_vegetarian": False, "tags": "chicken tikka masala"},
                    {"name": "Mutton Rogan Josh", "unit": "Bowl", "is_vegetarian": False, "tags": "mutton rogan josh"},
                    {"name": "Naan (Plain)", "unit": "Pcs", "is_vegetarian": True, "tags": "naan,bread"},
                    {"name": "Butter Naan", "unit": "Pcs", "is_vegetarian": True, "tags": "butter naan"},
                    {"name": "Garlic Naan", "unit": "Pcs", "is_vegetarian": True, "tags": "garlic naan"},
                    {"name": "Roti (Tandoor)", "unit": "Pcs", "is_vegetarian": True, "tags": "roti,tandoor"},
                    {"name": "Parotta (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "parotta,kerala parotta"},
                    {"name": "Egg Parotta", "unit": "Plate", "is_vegetarian": False, "tags": "egg parotta"},
                    {"name": "Chicken Parotta", "unit": "Plate", "is_vegetarian": False, "tags": "chicken parotta"},
                ]
            },
            {
                "name": "Desserts and Sweets",
                "subcategories": [],
                "items": [
                    {"name": "Gulab Jamun (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "gulab jamun,sweet"},
                    {"name": "Rasgulla (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "rasgulla"},
                    {"name": "Kheer", "unit": "Bowl", "is_vegetarian": True, "tags": "kheer,rice pudding"},
                    {"name": "Payasam", "unit": "Bowl", "is_vegetarian": True, "tags": "payasam,south indian sweet"},
                    {"name": "Halwa", "unit": "Bowl", "is_vegetarian": True, "tags": "halwa"},
                    {"name": "Kulfi", "unit": "Pcs", "is_vegetarian": True, "tags": "kulfi,ice cream"},
                    {"name": "Ice Cream (Vanilla)", "unit": "Scoop", "is_vegetarian": True, "tags": "ice cream"},
                    {"name": "Ice Cream (Chocolate)", "unit": "Scoop", "is_vegetarian": True, "tags": "ice cream"},
                    {"name": "Ice Cream (Strawberry)", "unit": "Scoop", "is_vegetarian": True, "tags": "ice cream"},
                    {"name": "Brownie with Ice Cream", "unit": "Plate", "is_vegetarian": True, "tags": "brownie,dessert"},
                ]
            },
            {
                "name": "Beverages",
                "subcategories": ["Hot Beverages", "Cold Beverages", "Fresh Juice", "Milkshakes", "Soft Drinks"],
                "items": [
                    {"name": "Tea (Cutting)", "unit": "Cup", "is_vegetarian": True, "tags": "tea,chai"},
                    {"name": "Tea (Regular)", "unit": "Cup", "is_vegetarian": True, "tags": "tea,chai"},
                    {"name": "Masala Tea", "unit": "Cup", "is_vegetarian": True, "tags": "masala chai,ginger tea"},
                    {"name": "Ginger Tea", "unit": "Cup", "is_vegetarian": True, "tags": "ginger tea"},
                    {"name": "Lemon Tea", "unit": "Cup", "is_vegetarian": True, "tags": "lemon tea"},
                    {"name": "Filter Coffee", "unit": "Cup", "is_vegetarian": True, "tags": "filter coffee,south indian coffee"},
                    {"name": "Black Coffee", "unit": "Cup", "is_vegetarian": True, "tags": "black coffee"},
                    {"name": "Milk Coffee", "unit": "Cup", "is_vegetarian": True, "tags": "milk coffee"},
                    {"name": "Espresso", "unit": "Cup", "is_vegetarian": True, "tags": "espresso"},
                    {"name": "Cappuccino", "unit": "Cup", "is_vegetarian": True, "tags": "cappuccino"},
                    {"name": "Latte", "unit": "Cup", "is_vegetarian": True, "tags": "latte"},
                    {"name": "Cold Coffee", "unit": "Glass", "is_vegetarian": True, "tags": "cold coffee"},
                    {"name": "Fresh Lime Water (Sweet)", "unit": "Glass", "is_vegetarian": True, "tags": "lime water,lemon"},
                    {"name": "Fresh Lime Soda", "unit": "Glass", "is_vegetarian": True, "tags": "lime soda"},
                    {"name": "Lemon Juice", "unit": "Glass", "is_vegetarian": True, "tags": "lemon juice,fresh juice"},
                    {"name": "Orange Juice", "unit": "Glass", "is_vegetarian": True, "tags": "orange juice,fresh juice"},
                    {"name": "Watermelon Juice", "unit": "Glass", "is_vegetarian": True, "tags": "watermelon juice"},
                    {"name": "Pineapple Juice", "unit": "Glass", "is_vegetarian": True, "tags": "pineapple juice"},
                    {"name": "Mango Juice", "unit": "Glass", "is_vegetarian": True, "tags": "mango juice"},
                    {"name": "Mixed Fruit Juice", "unit": "Glass", "is_vegetarian": True, "tags": "mixed juice"},
                    {"name": "Banana Milkshake", "unit": "Glass", "is_vegetarian": True, "tags": "banana milkshake"},
                    {"name": "Mango Milkshake", "unit": "Glass", "is_vegetarian": True, "tags": "mango milkshake"},
                    {"name": "Strawberry Milkshake", "unit": "Glass", "is_vegetarian": True, "tags": "strawberry milkshake"},
                    {"name": "Chocolate Milkshake", "unit": "Glass", "is_vegetarian": True, "tags": "chocolate milkshake"},
                    {"name": "Lassi (Sweet)", "unit": "Glass", "is_vegetarian": True, "tags": "sweet lassi"},
                    {"name": "Lassi (Salted)", "unit": "Glass", "is_vegetarian": True, "tags": "salted lassi"},
                    {"name": "Mango Lassi", "unit": "Glass", "is_vegetarian": True, "tags": "mango lassi"},
                    {"name": "Buttermilk (Chaas)", "unit": "Glass", "is_vegetarian": True, "tags": "buttermilk,chaas"},
                    {"name": "Coca-Cola (300ml)", "unit": "Bottle", "is_vegetarian": True, "tags": "coke,cola,soft drink"},
                    {"name": "Pepsi (300ml)", "unit": "Bottle", "is_vegetarian": True, "tags": "pepsi,soft drink"},
                    {"name": "Sprite (300ml)", "unit": "Bottle", "is_vegetarian": True, "tags": "sprite,soft drink"},
                    {"name": "Thumbs Up (300ml)", "unit": "Bottle", "is_vegetarian": True, "tags": "thumbs up,soft drink"},
                    {"name": "Maaza (250ml)", "unit": "Bottle", "is_vegetarian": True, "tags": "maaza,mango drink"},
                    {"name": "Frooti (200ml)", "unit": "Pack", "is_vegetarian": True, "tags": "frooti,mango"},
                    {"name": "Mineral Water (500ml)", "unit": "Bottle", "is_vegetarian": True, "tags": "water,packaged water"},
                    {"name": "Mineral Water (1L)", "unit": "Bottle", "is_vegetarian": True, "tags": "water"},
                ]
            },
            {
                "name": "Snacks",
                "subcategories": [],
                "items": [
                    {"name": "Samosa (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "samosa,snack"},
                    {"name": "Kachori (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "kachori"},
                    {"name": "Bonda (2 pcs)", "unit": "Plate", "is_vegetarian": True, "tags": "bonda,south indian snack"},
                    {"name": "Bhajia / Pakora", "unit": "Plate", "is_vegetarian": True, "tags": "bhajia,pakora,snack"},
                    {"name": "French Fries", "unit": "Plate", "is_vegetarian": True, "tags": "french fries,fries"},
                    {"name": "Masala Fries", "unit": "Plate", "is_vegetarian": True, "tags": "masala fries"},
                    {"name": "Sandwich (Veg)", "unit": "Plate", "is_vegetarian": True, "tags": "sandwich,veg"},
                    {"name": "Sandwich (Chicken)", "unit": "Plate", "is_vegetarian": False, "tags": "chicken sandwich"},
                    {"name": "Club Sandwich", "unit": "Plate", "is_vegetarian": False, "tags": "club sandwich"},
                    {"name": "Burger (Veg)", "unit": "Pcs", "is_vegetarian": True, "tags": "veg burger"},
                    {"name": "Burger (Chicken)", "unit": "Pcs", "is_vegetarian": False, "tags": "chicken burger"},
                    {"name": "Pizza (Margherita) - 7\"", "unit": "Pcs", "is_vegetarian": True, "tags": "pizza,margherita"},
                    {"name": "Pizza (Veg Supreme) - 7\"", "unit": "Pcs", "is_vegetarian": True, "tags": "pizza,veg"},
                    {"name": "Pizza (Chicken) - 7\"", "unit": "Pcs", "is_vegetarian": False, "tags": "pizza,chicken"},
                ]
            },
            {
                "name": "Combos and Meal Deals",
                "subcategories": [],
                "items": [
                    {"name": "Breakfast Combo (Idli + Vada + Coffee)", "unit": "Set", "is_vegetarian": True, "tags": "breakfast combo"},
                    {"name": "Meal Combo (Rice + Curry + Papad)", "unit": "Set", "is_vegetarian": True, "tags": "meal combo"},
                    {"name": "Biryani Combo (Biryani + Raita + Pepsi)", "unit": "Set", "is_vegetarian": None, "tags": "biryani combo"},
                    {"name": "Burger Meal (Burger + Fries + Drink)", "unit": "Set", "is_vegetarian": None, "tags": "burger meal"},
                    {"name": "Family Pack (4 Meals)", "unit": "Pack", "is_vegetarian": None, "tags": "family pack"},
                ]
            }
        ]
    },

    "supermarket": {
        "display_name": "Supermarket",
        "categories": [
            {
                "name": "Rice and Grains",
                "subcategories": [],
                "items": [
                    {"name": "Basmati Rice", "unit": "Kg"},
                    {"name": "Sona Masoori Rice", "unit": "Kg"},
                    {"name": "Raw Rice (Ponni)", "unit": "Kg"},
                    {"name": "Idli Rice", "unit": "Kg"},
                    {"name": "Boiled Rice", "unit": "Kg"},
                    {"name": "Brown Rice", "unit": "Kg"},
                    {"name": "Jeera Rice (Seeraga Samba)", "unit": "Kg"},
                    {"name": "Kolam Rice", "unit": "Kg"},
                    {"name": "Wheat (Whole)", "unit": "Kg"},
                    {"name": "Broken Wheat (Dalia)", "unit": "Kg"},
                    {"name": "Semolina (Rava/Sooji)", "unit": "Kg"},
                    {"name": "Corn Flour", "unit": "Kg"},
                    {"name": "Maize (Corn)", "unit": "Kg"},
                    {"name": "Poha (Flattened Rice)", "unit": "Kg"},
                    {"name": "Millet (Ragi)", "unit": "Kg"},
                    {"name": "Millet (Bajra)", "unit": "Kg"},
                    {"name": "Millet (Jowar)", "unit": "Kg"},
                    {"name": "Quinoa", "unit": "Kg"},
                    {"name": "Oats (Rolled)", "unit": "Kg"},
                ]
            },
            {
                "name": "Pulses and Lentils",
                "subcategories": [],
                "items": [
                    {"name": "Toor Dal (Arhar)", "unit": "Kg"},
                    {"name": "Moong Dal (Yellow)", "unit": "Kg"},
                    {"name": "Moong Dal (Green, whole)", "unit": "Kg"},
                    {"name": "Urad Dal (Black)", "unit": "Kg"},
                    {"name": "Urad Dal (White, split)", "unit": "Kg"},
                    {"name": "Chana Dal", "unit": "Kg"},
                    {"name": "Masoor Dal (Red Lentils)", "unit": "Kg"},
                    {"name": "Chickpeas (Kabuli Chana)", "unit": "Kg"},
                    {"name": "Black Eyed Peas (Lobia)", "unit": "Kg"},
                    {"name": "Kidney Beans (Rajma)", "unit": "Kg"},
                    {"name": "Green Peas (Dried)", "unit": "Kg"},
                    {"name": "Horse Gram (Kollu)", "unit": "Kg"},
                ]
            },
            {
                "name": "Flour and Atta",
                "subcategories": [],
                "items": [
                    {"name": "Wheat Flour (Atta)", "unit": "Kg"},
                    {"name": "Maida (All Purpose Flour)", "unit": "Kg"},
                    {"name": "Besan (Chickpea Flour)", "unit": "Kg"},
                    {"name": "Rice Flour", "unit": "Kg"},
                    {"name": "Ragi Flour", "unit": "Kg"},
                    {"name": "Bajra Flour", "unit": "Kg"},
                    {"name": "Multigrain Atta", "unit": "Kg"},
                    {"name": "Idli/Dosa Batter (Ready)", "unit": "Kg"},
                ]
            },
            {
                "name": "Cooking Oil and Ghee",
                "subcategories": [],
                "items": [
                    {"name": "Sunflower Oil (1L)", "unit": "Bottle"},
                    {"name": "Sunflower Oil (5L)", "unit": "Can"},
                    {"name": "Groundnut Oil (1L)", "unit": "Bottle"},
                    {"name": "Coconut Oil (500ml)", "unit": "Bottle"},
                    {"name": "Coconut Oil (1L)", "unit": "Bottle"},
                    {"name": "Sesame Oil (Gingelly) (500ml)", "unit": "Bottle"},
                    {"name": "Mustard Oil (1L)", "unit": "Bottle"},
                    {"name": "Soybean Oil (1L)", "unit": "Bottle"},
                    {"name": "Rice Bran Oil (1L)", "unit": "Bottle"},
                    {"name": "Olive Oil (500ml)", "unit": "Bottle"},
                    {"name": "Cow Ghee (500g)", "unit": "Jar"},
                    {"name": "Cow Ghee (1Kg)", "unit": "Tin"},
                    {"name": "Dalda Vanaspati (1Kg)", "unit": "Tin"},
                ]
            },
            {
                "name": "Spices and Masala",
                "subcategories": ["Whole Spices", "Ground Spices", "Masala Blends"],
                "items": [
                    {"name": "Turmeric Powder (100g)", "unit": "Pack"},
                    {"name": "Red Chilli Powder (100g)", "unit": "Pack"},
                    {"name": "Coriander Powder (100g)", "unit": "Pack"},
                    {"name": "Cumin Seeds (Jeera) (100g)", "unit": "Pack"},
                    {"name": "Mustard Seeds (100g)", "unit": "Pack"},
                    {"name": "Pepper (Black, 50g)", "unit": "Pack"},
                    {"name": "Cardamom (Elaichi, 50g)", "unit": "Pack"},
                    {"name": "Cloves (50g)", "unit": "Pack"},
                    {"name": "Cinnamon (100g)", "unit": "Pack"},
                    {"name": "Bay Leaves (20g)", "unit": "Pack"},
                    {"name": "Garam Masala (100g)", "unit": "Pack"},
                    {"name": "Chicken Masala (100g)", "unit": "Pack"},
                    {"name": "Sambar Powder (200g)", "unit": "Pack"},
                    {"name": "Rasam Powder (100g)", "unit": "Pack"},
                    {"name": "Biryani Masala (50g)", "unit": "Pack"},
                    {"name": "Kitchen King Masala (100g)", "unit": "Pack"},
                    {"name": "Chaat Masala (100g)", "unit": "Pack"},
                    {"name": "Asafoetida (Hing, 25g)", "unit": "Pack"},
                    {"name": "Curry Leaves (Fresh, 100g)", "unit": "Pack"},
                    {"name": "Dried Red Chilli (100g)", "unit": "Pack"},
                ]
            },
            {
                "name": "Sugar, Salt and Sweeteners",
                "subcategories": [],
                "items": [
                    {"name": "Sugar (White, 1Kg)", "unit": "Pack"},
                    {"name": "Sugar (White, 5Kg)", "unit": "Pack"},
                    {"name": "Jaggery (Gur, 500g)", "unit": "Pack"},
                    {"name": "Rock Salt (500g)", "unit": "Pack"},
                    {"name": "Iodised Salt (1Kg)", "unit": "Pack"},
                    {"name": "Sea Salt (500g)", "unit": "Pack"},
                    {"name": "Honey (500g)", "unit": "Bottle"},
                    {"name": "Stevia (50g)", "unit": "Pack"},
                ]
            },
            {
                "name": "Dairy Products",
                "subcategories": ["Milk", "Curd and Butter", "Cheese and Paneer"],
                "items": [
                    {"name": "Full Cream Milk (500ml)", "unit": "Packet"},
                    {"name": "Full Cream Milk (1L)", "unit": "Packet"},
                    {"name": "Toned Milk (500ml)", "unit": "Packet"},
                    {"name": "Skimmed Milk (500ml)", "unit": "Packet"},
                    {"name": "Curd / Yoghurt (400g)", "unit": "Cup"},
                    {"name": "Butter (100g)", "unit": "Pack"},
                    {"name": "Butter (500g)", "unit": "Pack"},
                    {"name": "Paneer (200g)", "unit": "Pack"},
                    {"name": "Cheese Slice (200g)", "unit": "Pack"},
                    {"name": "Cream (200ml)", "unit": "Pack"},
                    {"name": "Condensed Milk (400g)", "unit": "Tin"},
                    {"name": "Milk Powder (500g)", "unit": "Pack"},
                    {"name": "Eggs (6 pcs)", "unit": "Tray"},
                    {"name": "Eggs (12 pcs)", "unit": "Tray"},
                    {"name": "Eggs (30 pcs)", "unit": "Tray"},
                ]
            },
            {
                "name": "Biscuits and Cookies",
                "subcategories": [],
                "items": [
                    {"name": "Parle-G (100g)", "unit": "Pack"},
                    {"name": "Parle-G (200g)", "unit": "Pack"},
                    {"name": "Bourbon Biscuits", "unit": "Pack"},
                    {"name": "Marie Light Biscuits", "unit": "Pack"},
                    {"name": "Good Day Butter Biscuits", "unit": "Pack"},
                    {"name": "Britannia 50-50", "unit": "Pack"},
                    {"name": "Oreo (120g)", "unit": "Pack"},
                    {"name": "Hide & Seek Biscuits", "unit": "Pack"},
                    {"name": "Cream Crackers", "unit": "Pack"},
                    {"name": "Digestive Biscuits (250g)", "unit": "Pack"},
                ]
            },
            {
                "name": "Snacks and Chips",
                "subcategories": [],
                "items": [
                    {"name": "Lay's Classic Salted (26g)", "unit": "Pack"},
                    {"name": "Lay's Classic Salted (52g)", "unit": "Pack"},
                    {"name": "Kurkure (50g)", "unit": "Pack"},
                    {"name": "Uncle Chipps", "unit": "Pack"},
                    {"name": "Haldiram's Bhujia (200g)", "unit": "Pack"},
                    {"name": "Haldiram's Aloo Bhujia (200g)", "unit": "Pack"},
                    {"name": "Haldiram's Namkeen Mix (200g)", "unit": "Pack"},
                    {"name": "Murukku (200g)", "unit": "Pack"},
                    {"name": "Chakli (200g)", "unit": "Pack"},
                    {"name": "Popcorn (Pack)", "unit": "Pack"},
                    {"name": "Mixture (200g)", "unit": "Pack"},
                    {"name": "Peanuts (Roasted, 200g)", "unit": "Pack"},
                    {"name": "Cashews (100g)", "unit": "Pack"},
                    {"name": "Almonds (100g)", "unit": "Pack"},
                    {"name": "Raisins (200g)", "unit": "Pack"},
                ]
            },
            {
                "name": "Soft Drinks and Beverages",
                "subcategories": [],
                "items": [
                    {"name": "Coca-Cola (600ml)", "unit": "Bottle"},
                    {"name": "Coca-Cola (2L)", "unit": "Bottle"},
                    {"name": "Pepsi (600ml)", "unit": "Bottle"},
                    {"name": "Sprite (600ml)", "unit": "Bottle"},
                    {"name": "Limca (600ml)", "unit": "Bottle"},
                    {"name": "Maaza (600ml)", "unit": "Bottle"},
                    {"name": "Slice (600ml)", "unit": "Bottle"},
                    {"name": "Mountain Dew (600ml)", "unit": "Bottle"},
                    {"name": "Thums Up (600ml)", "unit": "Bottle"},
                    {"name": "Red Bull (250ml)", "unit": "Can"},
                    {"name": "Sting Energy Drink (250ml)", "unit": "Bottle"},
                    {"name": "Real Juice (1L)", "unit": "Pack"},
                    {"name": "Tropicana (1L)", "unit": "Pack"},
                    {"name": "Paper Boat Aamras (250ml)", "unit": "Pack"},
                    {"name": "Bisleri Water (500ml)", "unit": "Bottle"},
                    {"name": "Bisleri Water (1L)", "unit": "Bottle"},
                    {"name": "Kinley Water (500ml)", "unit": "Bottle"},
                ]
            },
            {
                "name": "Tea and Coffee",
                "subcategories": [],
                "items": [
                    {"name": "Brooke Bond Red Label Tea (250g)", "unit": "Pack"},
                    {"name": "Tata Tea Gold (250g)", "unit": "Pack"},
                    {"name": "Lipton Tea (250g)", "unit": "Pack"},
                    {"name": "Wagh Bakri Tea (250g)", "unit": "Pack"},
                    {"name": "Green Tea (25 bags)", "unit": "Box"},
                    {"name": "Bru Coffee (50g)", "unit": "Pack"},
                    {"name": "Nescafe Classic (50g)", "unit": "Jar"},
                    {"name": "Bru Gold (50g)", "unit": "Pack"},
                    {"name": "Filter Coffee Powder (200g)", "unit": "Pack"},
                ]
            },
            {
                "name": "Personal Care",
                "subcategories": ["Skin Care", "Hair Care", "Oral Care", "Body Care"],
                "items": [
                    {"name": "Lux Soap (100g)", "unit": "Pcs"},
                    {"name": "Dove Soap (100g)", "unit": "Pcs"},
                    {"name": "Dettol Soap (125g)", "unit": "Pcs"},
                    {"name": "Pears Soap (125g)", "unit": "Pcs"},
                    {"name": "Lifebuoy Soap (100g)", "unit": "Pcs"},
                    {"name": "Colgate Toothpaste (200g)", "unit": "Tube"},
                    {"name": "Pepsodent Toothpaste (150g)", "unit": "Tube"},
                    {"name": "Closeup Toothpaste (150g)", "unit": "Tube"},
                    {"name": "Oral-B Toothbrush", "unit": "Pcs"},
                    {"name": "Colgate Toothbrush", "unit": "Pcs"},
                    {"name": "Sunsilk Shampoo (200ml)", "unit": "Bottle"},
                    {"name": "Head & Shoulders Shampoo (200ml)", "unit": "Bottle"},
                    {"name": "Pantene Shampoo (200ml)", "unit": "Bottle"},
                    {"name": "Dove Shampoo (200ml)", "unit": "Bottle"},
                    {"name": "Clinic Plus Shampoo (175ml)", "unit": "Bottle"},
                    {"name": "Parachute Coconut Oil (200ml)", "unit": "Bottle"},
                    {"name": "Navratna Oil (200ml)", "unit": "Bottle"},
                    {"name": "Fair & Lovely Cream (50g)", "unit": "Tube"},
                    {"name": "Pond's Face Wash (100ml)", "unit": "Tube"},
                    {"name": "Nair Hair Removal Cream (40g)", "unit": "Pack"},
                    {"name": "Gillette Shaving Gel (200ml)", "unit": "Bottle"},
                    {"name": "Old Spice Deodorant", "unit": "Bottle"},
                    {"name": "Fogg Deodorant (150ml)", "unit": "Bottle"},
                    {"name": "Nivea Body Lotion (200ml)", "unit": "Bottle"},
                    {"name": "Vaseline Petroleum Jelly (50ml)", "unit": "Jar"},
                ]
            },
            {
                "name": "Cleaning Products",
                "subcategories": [],
                "items": [
                    {"name": "Surf Excel (1Kg)", "unit": "Pack"},
                    {"name": "Ariel (1Kg)", "unit": "Pack"},
                    {"name": "Rin Powder (1Kg)", "unit": "Pack"},
                    {"name": "Tide (1Kg)", "unit": "Pack"},
                    {"name": "Wheel Detergent (1Kg)", "unit": "Pack"},
                    {"name": "Comfort Fabric Softener (800ml)", "unit": "Bottle"},
                    {"name": "Vim Bar (200g)", "unit": "Pcs"},
                    {"name": "Vim Liquid (500ml)", "unit": "Bottle"},
                    {"name": "Colin Glass Cleaner (500ml)", "unit": "Bottle"},
                    {"name": "Domex Floor Cleaner (500ml)", "unit": "Bottle"},
                    {"name": "Harpic Toilet Cleaner (500ml)", "unit": "Bottle"},
                    {"name": "Lizol Floor Cleaner (500ml)", "unit": "Bottle"},
                    {"name": "Dettol Disinfectant (500ml)", "unit": "Bottle"},
                    {"name": "Good Knight Mosquito Coil", "unit": "Pack"},
                    {"name": "Hit Cockroach Spray (200ml)", "unit": "Can"},
                ]
            },
            {
                "name": "Baby Care",
                "subcategories": [],
                "items": [
                    {"name": "Pampers Diapers (Small, 20 pcs)", "unit": "Pack"},
                    {"name": "Pampers Diapers (Medium, 20 pcs)", "unit": "Pack"},
                    {"name": "Huggies Diapers (Small, 20 pcs)", "unit": "Pack"},
                    {"name": "Johnson's Baby Powder (200g)", "unit": "Bottle"},
                    {"name": "Johnson's Baby Shampoo (200ml)", "unit": "Bottle"},
                    {"name": "Johnson's Baby Oil (200ml)", "unit": "Bottle"},
                    {"name": "Baby Soap (75g)", "unit": "Pcs"},
                    {"name": "Cerelac (Stage 1, 300g)", "unit": "Pack"},
                    {"name": "Nan Baby Formula (400g)", "unit": "Pack"},
                    {"name": "Baby Wipes (80 pcs)", "unit": "Pack"},
                ]
            },
            {
                "name": "Household Supplies",
                "subcategories": [],
                "items": [
                    {"name": "Tissue Paper (100 sheets)", "unit": "Pack"},
                    {"name": "Kitchen Towel Roll", "unit": "Roll"},
                    {"name": "Garbage Bags (Medium, 30L, 30 pcs)", "unit": "Pack"},
                    {"name": "Aluminium Foil (10m)", "unit": "Roll"},
                    {"name": "Cling Wrap (20m)", "unit": "Roll"},
                    {"name": "Broom (Plastic)", "unit": "Pcs"},
                    {"name": "Mop", "unit": "Pcs"},
                    {"name": "Scrub Pad", "unit": "Pcs"},
                    {"name": "Safety Pin (12 pcs)", "unit": "Pack"},
                    {"name": "Matchbox (10 pcs)", "unit": "Pack"},
                    {"name": "Candles (10 pcs)", "unit": "Pack"},
                    {"name": "Batteries AA (4 pcs)", "unit": "Pack"},
                    {"name": "Batteries AAA (4 pcs)", "unit": "Pack"},
                ]
            }
        ]
    },

    "pharmacy": {
        "display_name": "Pharmacy",
        "categories": [
            {
                "name": "OTC Medicines",
                "subcategories": ["Pain Relief", "Cold and Flu", "Digestion", "Vitamins"],
                "items": [
                    {"name": "Paracetamol 500mg Tab", "unit": "Strip", "tags": "paracetamol,fever,pain"},
                    {"name": "Crocin 500mg Tab", "unit": "Strip", "tags": "crocin,fever"},
                    {"name": "Dolo 650mg Tab", "unit": "Strip", "tags": "dolo,fever"},
                    {"name": "Ibuprofen 400mg Tab", "unit": "Strip", "tags": "ibuprofen,pain"},
                    {"name": "Aspirin 75mg Tab", "unit": "Strip", "tags": "aspirin"},
                    {"name": "Combiflam Tab", "unit": "Strip", "tags": "combiflam,pain,fever"},
                    {"name": "Cough Syrup (100ml)", "unit": "Bottle", "tags": "cough syrup"},
                    {"name": "ORS Powder (Orange)", "unit": "Sachet", "tags": "ors,rehydration"},
                    {"name": "Antacid Tablet", "unit": "Strip", "tags": "antacid,acidity"},
                    {"name": "Digene Gel (200ml)", "unit": "Bottle", "tags": "digene,acidity"},
                    {"name": "Vitamin C 500mg", "unit": "Strip", "tags": "vitamin c"},
                    {"name": "Vitamin D3 Supplement", "unit": "Strip", "tags": "vitamin d"},
                    {"name": "Multivitamin (30 tabs)", "unit": "Bottle", "tags": "multivitamin"},
                    {"name": "Calcium + D3 Tablet", "unit": "Strip", "tags": "calcium"},
                    {"name": "Iron + Folic Acid Tab", "unit": "Strip", "tags": "iron,folic acid"},
                ]
            },
            {
                "name": "First Aid",
                "subcategories": [],
                "items": [
                    {"name": "Band-Aid (10 pcs)", "unit": "Pack"},
                    {"name": "Betadine Antiseptic (30ml)", "unit": "Bottle"},
                    {"name": "Cotton Bandage (5cm x 4m)", "unit": "Roll"},
                    {"name": "Crepe Bandage (10cm)", "unit": "Roll"},
                    {"name": "Dettol Antiseptic (500ml)", "unit": "Bottle"},
                    {"name": "Disposable Gloves (100 pcs)", "unit": "Box"},
                    {"name": "Surgical Mask (50 pcs)", "unit": "Box"},
                    {"name": "Thermometer (Digital)", "unit": "Pcs"},
                    {"name": "BP Monitor (Digital)", "unit": "Pcs"},
                    {"name": "Glucometer Kit", "unit": "Pcs"},
                    {"name": "Glucose Test Strips (50 pcs)", "unit": "Box"},
                    {"name": "Nebulizer", "unit": "Pcs"},
                    {"name": "Pulse Oximeter", "unit": "Pcs"},
                ]
            },
            {
                "name": "Baby and Mother Care",
                "subcategories": [],
                "items": [
                    {"name": "Pregnancy Test Kit", "unit": "Pcs"},
                    {"name": "Baby Cereal (300g)", "unit": "Pack"},
                    {"name": "Gripe Water (100ml)", "unit": "Bottle"},
                    {"name": "Colic Drops", "unit": "Bottle"},
                    {"name": "Baby Vitamin D Drops", "unit": "Bottle"},
                    {"name": "Folic Acid Tablets", "unit": "Strip"},
                ]
            }
        ]
    },

    "clothing": {
        "display_name": "Clothing & Garments",
        "categories": [
            {
                "name": "Men's Clothing",
                "subcategories": ["Formal", "Casual", "Ethnic", "Sportswear"],
                "items": [
                    {"name": "Men's Formal Shirt", "unit": "Pcs"},
                    {"name": "Men's Casual Shirt", "unit": "Pcs"},
                    {"name": "Men's T-Shirt (Round Neck)", "unit": "Pcs"},
                    {"name": "Men's T-Shirt (V-Neck)", "unit": "Pcs"},
                    {"name": "Men's Polo T-Shirt", "unit": "Pcs"},
                    {"name": "Men's Formal Trousers", "unit": "Pcs"},
                    {"name": "Men's Jeans", "unit": "Pcs"},
                    {"name": "Men's Cargo Pants", "unit": "Pcs"},
                    {"name": "Men's Shorts", "unit": "Pcs"},
                    {"name": "Men's Track Pants", "unit": "Pcs"},
                    {"name": "Men's Kurta", "unit": "Pcs"},
                    {"name": "Men's Kurta Pyjama Set", "unit": "Set"},
                    {"name": "Men's Blazer", "unit": "Pcs"},
                    {"name": "Men's Jacket (Winter)", "unit": "Pcs"},
                    {"name": "Men's Sweatshirt", "unit": "Pcs"},
                    {"name": "Men's Vest / Baniyan", "unit": "Pcs"},
                    {"name": "Men's Brief (Pack of 3)", "unit": "Pack"},
                    {"name": "Men's Boxers", "unit": "Pcs"},
                    {"name": "Men's Socks (Pack of 3)", "unit": "Pack"},
                ]
            },
            {
                "name": "Women's Clothing",
                "subcategories": ["Ethnic", "Western", "Nightwear", "Innerwear"],
                "items": [
                    {"name": "Women's Saree (Cotton)", "unit": "Pcs"},
                    {"name": "Women's Saree (Silk)", "unit": "Pcs"},
                    {"name": "Women's Saree (Synthetic)", "unit": "Pcs"},
                    {"name": "Women's Salwar Kameez", "unit": "Set"},
                    {"name": "Women's Churidar Set", "unit": "Set"},
                    {"name": "Women's Kurti", "unit": "Pcs"},
                    {"name": "Women's Leggings", "unit": "Pcs"},
                    {"name": "Women's Dupatta", "unit": "Pcs"},
                    {"name": "Women's Blouse", "unit": "Pcs"},
                    {"name": "Women's T-Shirt", "unit": "Pcs"},
                    {"name": "Women's Jeans", "unit": "Pcs"},
                    {"name": "Women's Top (Western)", "unit": "Pcs"},
                    {"name": "Women's Dress", "unit": "Pcs"},
                    {"name": "Women's Skirt", "unit": "Pcs"},
                    {"name": "Women's Nightgown", "unit": "Pcs"},
                    {"name": "Women's Night Suit (Set)", "unit": "Set"},
                    {"name": "Women's Bra", "unit": "Pcs"},
                    {"name": "Women's Panty (Pack of 3)", "unit": "Pack"},
                    {"name": "Women's Socks (Pack of 3)", "unit": "Pack"},
                ]
            },
            {
                "name": "Kids' Clothing",
                "subcategories": ["Boys", "Girls", "Infants"],
                "items": [
                    {"name": "Boys T-Shirt", "unit": "Pcs"},
                    {"name": "Boys Jeans", "unit": "Pcs"},
                    {"name": "Boys Shorts", "unit": "Pcs"},
                    {"name": "Boys School Uniform Shirt", "unit": "Pcs"},
                    {"name": "Boys Ethnic Kurta Set", "unit": "Set"},
                    {"name": "Girls Frock / Dress", "unit": "Pcs"},
                    {"name": "Girls Skirt & Top Set", "unit": "Set"},
                    {"name": "Girls Leggings", "unit": "Pcs"},
                    {"name": "Girls Salwar Set", "unit": "Set"},
                    {"name": "Infant Romper", "unit": "Pcs"},
                    {"name": "Infant Bodysuit", "unit": "Pcs"},
                    {"name": "Kids Socks (Pack of 3)", "unit": "Pack"},
                ]
            }
        ]
    },

    "electronics": {
        "display_name": "Electronics & Computers",
        "categories": [
            {
                "name": "Computers and Laptops",
                "subcategories": [],
                "items": [
                    {"name": "Laptop (Standard Config)", "unit": "Pcs"},
                    {"name": "Desktop PC (Complete Set)", "unit": "Set"},
                    {"name": "Desktop PC (CPU Only)", "unit": "Pcs"},
                    {"name": "All-in-One PC", "unit": "Pcs"},
                    {"name": "Tablet", "unit": "Pcs"},
                    {"name": "Chromebook", "unit": "Pcs"},
                ]
            },
            {
                "name": "Computer Accessories",
                "subcategories": [],
                "items": [
                    {"name": "Keyboard (USB)", "unit": "Pcs"},
                    {"name": "Keyboard (Wireless)", "unit": "Pcs"},
                    {"name": "Mouse (USB)", "unit": "Pcs"},
                    {"name": "Mouse (Wireless)", "unit": "Pcs"},
                    {"name": "Monitor (21\")", "unit": "Pcs"},
                    {"name": "Monitor (24\")", "unit": "Pcs"},
                    {"name": "Webcam (HD)", "unit": "Pcs"},
                    {"name": "Headphone", "unit": "Pcs"},
                    {"name": "Headset with Mic", "unit": "Pcs"},
                    {"name": "Speaker (USB)", "unit": "Pcs"},
                    {"name": "USB Hub (4 Port)", "unit": "Pcs"},
                    {"name": "External Hard Drive (1TB)", "unit": "Pcs"},
                    {"name": "Pendrive (32GB)", "unit": "Pcs"},
                    {"name": "Pendrive (64GB)", "unit": "Pcs"},
                    {"name": "Pendrive (128GB)", "unit": "Pcs"},
                    {"name": "SD Card (32GB)", "unit": "Pcs"},
                    {"name": "RAM (8GB DDR4)", "unit": "Pcs"},
                    {"name": "SSD (256GB)", "unit": "Pcs"},
                    {"name": "SSD (512GB)", "unit": "Pcs"},
                    {"name": "Laptop Bag", "unit": "Pcs"},
                    {"name": "Laptop Stand", "unit": "Pcs"},
                ]
            },
            {
                "name": "Mobile and Accessories",
                "subcategories": [],
                "items": [
                    {"name": "Smartphone (Android)", "unit": "Pcs"},
                    {"name": "Smartphone (Apple iPhone)", "unit": "Pcs"},
                    {"name": "Mobile Cover / Case", "unit": "Pcs"},
                    {"name": "Tempered Glass Screen Protector", "unit": "Pcs"},
                    {"name": "Charger (USB-C, 18W)", "unit": "Pcs"},
                    {"name": "Charger (USB-C, 33W)", "unit": "Pcs"},
                    {"name": "Charger (Apple Lightning)", "unit": "Pcs"},
                    {"name": "Wireless Charger (15W)", "unit": "Pcs"},
                    {"name": "Power Bank (10000mAh)", "unit": "Pcs"},
                    {"name": "Power Bank (20000mAh)", "unit": "Pcs"},
                    {"name": "Earphones (Wired)", "unit": "Pcs"},
                    {"name": "Earbuds (TWS, Wireless)", "unit": "Pcs"},
                    {"name": "USB Cable (1m)", "unit": "Pcs"},
                    {"name": "USB Cable (2m)", "unit": "Pcs"},
                    {"name": "OTG Adapter", "unit": "Pcs"},
                    {"name": "Mobile Holder (Car)", "unit": "Pcs"},
                ]
            },
            {
                "name": "Home Appliances",
                "subcategories": [],
                "items": [
                    {"name": "LED TV (32\")", "unit": "Pcs"},
                    {"name": "LED TV (43\")", "unit": "Pcs"},
                    {"name": "LED TV (55\")", "unit": "Pcs"},
                    {"name": "Refrigerator (Single Door)", "unit": "Pcs"},
                    {"name": "Refrigerator (Double Door)", "unit": "Pcs"},
                    {"name": "Washing Machine (Top Load)", "unit": "Pcs"},
                    {"name": "Air Conditioner (1.5 Ton, 5 Star)", "unit": "Pcs"},
                    {"name": "Microwave Oven", "unit": "Pcs"},
                    {"name": "Mixer Grinder (3 Jars)", "unit": "Pcs"},
                    {"name": "Electric Kettle (1.5L)", "unit": "Pcs"},
                    {"name": "Iron (Steam)", "unit": "Pcs"},
                    {"name": "Fan (Ceiling)", "unit": "Pcs"},
                    {"name": "Fan (Table)", "unit": "Pcs"},
                    {"name": "Water Purifier (RO)", "unit": "Pcs"},
                ]
            }
        ]
    },

    "salon_beauty": {
        "display_name": "Salon & Beauty Parlour",
        "categories": [
            {
                "name": "Hair Services",
                "subcategories": [],
                "items": [
                    {"name": "Hair Cut (Men, Regular)", "unit": "Service", "is_service": True},
                    {"name": "Hair Cut (Men, Fancy)", "unit": "Service", "is_service": True},
                    {"name": "Hair Cut (Women, Short)", "unit": "Service", "is_service": True},
                    {"name": "Hair Cut (Women, Medium)", "unit": "Service", "is_service": True},
                    {"name": "Hair Cut (Women, Long)", "unit": "Service", "is_service": True},
                    {"name": "Hair Cut (Kids)", "unit": "Service", "is_service": True},
                    {"name": "Shave (Clean)", "unit": "Service", "is_service": True},
                    {"name": "Beard Trim", "unit": "Service", "is_service": True},
                    {"name": "Hair Wash (Shampoo + Conditioner)", "unit": "Service", "is_service": True},
                    {"name": "Head Massage", "unit": "Service", "is_service": True},
                    {"name": "Hair Colour (Root Touch-up)", "unit": "Service", "is_service": True},
                    {"name": "Hair Colour (Full)", "unit": "Service", "is_service": True},
                    {"name": "Global Hair Colour", "unit": "Service", "is_service": True},
                    {"name": "Hair Highlights", "unit": "Service", "is_service": True},
                    {"name": "Hair Straightening", "unit": "Service", "is_service": True},
                    {"name": "Hair Rebonding", "unit": "Service", "is_service": True},
                    {"name": "Hair Smoothening", "unit": "Service", "is_service": True},
                    {"name": "Keratin Treatment", "unit": "Service", "is_service": True},
                    {"name": "Hair Spa", "unit": "Service", "is_service": True},
                    {"name": "Dandruff Treatment", "unit": "Service", "is_service": True},
                ]
            },
            {
                "name": "Facial and Skin Services",
                "subcategories": [],
                "items": [
                    {"name": "Basic Facial", "unit": "Service", "is_service": True},
                    {"name": "Gold Facial", "unit": "Service", "is_service": True},
                    {"name": "Diamond Facial", "unit": "Service", "is_service": True},
                    {"name": "Bridal Facial", "unit": "Service", "is_service": True},
                    {"name": "Cleanup (Basic)", "unit": "Service", "is_service": True},
                    {"name": "Cleanup (Deep Pore)", "unit": "Service", "is_service": True},
                    {"name": "Threading (Eyebrow)", "unit": "Service", "is_service": True},
                    {"name": "Threading (Upper Lip)", "unit": "Service", "is_service": True},
                    {"name": "Threading (Full Face)", "unit": "Service", "is_service": True},
                    {"name": "Waxing (Arms)", "unit": "Service", "is_service": True},
                    {"name": "Waxing (Legs, Half)", "unit": "Service", "is_service": True},
                    {"name": "Waxing (Legs, Full)", "unit": "Service", "is_service": True},
                    {"name": "Waxing (Underarms)", "unit": "Service", "is_service": True},
                    {"name": "Bleach (Face)", "unit": "Service", "is_service": True},
                    {"name": "Bleach (Full Body)", "unit": "Service", "is_service": True},
                    {"name": "D-Tan Pack", "unit": "Service", "is_service": True},
                ]
            },
            {
                "name": "Nail Services",
                "subcategories": [],
                "items": [
                    {"name": "Manicure (Basic)", "unit": "Service", "is_service": True},
                    {"name": "Pedicure (Basic)", "unit": "Service", "is_service": True},
                    {"name": "Manicure + Pedicure Combo", "unit": "Service", "is_service": True},
                    {"name": "Nail Art (Per Nail)", "unit": "Service", "is_service": True},
                    {"name": "Gel Nails", "unit": "Service", "is_service": True},
                    {"name": "Nail Extension", "unit": "Service", "is_service": True},
                ]
            },
            {
                "name": "Makeup Services",
                "subcategories": [],
                "items": [
                    {"name": "Party Makeup", "unit": "Service", "is_service": True},
                    {"name": "Bridal Makeup (Simple)", "unit": "Service", "is_service": True},
                    {"name": "Bridal Makeup (HD)", "unit": "Service", "is_service": True},
                    {"name": "Saree Draping", "unit": "Service", "is_service": True},
                ]
            }
        ]
    },

    "professional_services": {
        "display_name": "Professional Services",
        "categories": [
            {
                "name": "Consulting Services",
                "subcategories": [],
                "items": [
                    {"name": "Consultation (Hourly)", "unit": "Hour", "is_service": True},
                    {"name": "Consultation (Half Day)", "unit": "Session", "is_service": True},
                    {"name": "Consultation (Full Day)", "unit": "Session", "is_service": True},
                    {"name": "Project Assessment", "unit": "Session", "is_service": True},
                    {"name": "Business Analysis Report", "unit": "Report", "is_service": True},
                ]
            },
            {
                "name": "Legal and Compliance",
                "subcategories": [],
                "items": [
                    {"name": "GST Registration", "unit": "Service", "is_service": True},
                    {"name": "GST Return Filing (Monthly)", "unit": "Service", "is_service": True},
                    {"name": "Income Tax Return Filing", "unit": "Service", "is_service": True},
                    {"name": "Company Registration", "unit": "Service", "is_service": True},
                    {"name": "Trademark Registration", "unit": "Service", "is_service": True},
                    {"name": "FSSAI License", "unit": "Service", "is_service": True},
                    {"name": "Accounting (Monthly)", "unit": "Month", "is_service": True},
                    {"name": "Bookkeeping (Monthly)", "unit": "Month", "is_service": True},
                    {"name": "Payroll Processing", "unit": "Month", "is_service": True},
                ]
            }
        ]
    },

    "repair_maintenance": {
        "display_name": "Repair & Maintenance",
        "categories": [
            {
                "name": "Mobile Repair",
                "subcategories": [],
                "items": [
                    {"name": "Screen Replacement (Diagnosis)", "unit": "Service", "is_service": True},
                    {"name": "Battery Replacement", "unit": "Service", "is_service": True},
                    {"name": "Charging Port Repair", "unit": "Service", "is_service": True},
                    {"name": "Speaker Repair", "unit": "Service", "is_service": True},
                    {"name": "Camera Repair", "unit": "Service", "is_service": True},
                    {"name": "Back Panel Replacement", "unit": "Service", "is_service": True},
                    {"name": "Software/OS Flashing", "unit": "Service", "is_service": True},
                    {"name": "Water Damage Repair", "unit": "Service", "is_service": True},
                ]
            },
            {
                "name": "Computer Repair",
                "subcategories": [],
                "items": [
                    {"name": "OS Installation (Windows)", "unit": "Service", "is_service": True},
                    {"name": "Virus Removal", "unit": "Service", "is_service": True},
                    {"name": "Data Recovery", "unit": "Service", "is_service": True},
                    {"name": "RAM Upgrade", "unit": "Service", "is_service": True},
                    {"name": "Hard Drive Replacement", "unit": "Service", "is_service": True},
                    {"name": "Laptop Screen Repair", "unit": "Service", "is_service": True},
                    {"name": "Keyboard Replacement", "unit": "Service", "is_service": True},
                    {"name": "Annual Maintenance Contract", "unit": "Year", "is_service": True},
                ]
            }
        ]
    }
}


# ─── Seed Function ─────────────────────────────────────────────────────────────

def seed_catalogue(db: Session) -> None:
    """Seed the starter catalogue — idempotent, safe to run multiple times."""

    existing_count = db.execute(
        __import__("sqlalchemy").text("SELECT COUNT(*) FROM catalogue_categories")
    ).scalar_one()

    if existing_count > 0:
        return  # Already seeded

    for biz_cat_key, biz_data in CATALOGUE_DATA.items():
        for cat_data in biz_data["categories"]:
            # Create category
            cat = CatalogueCategory(
                business_category=biz_cat_key,
                name=cat_data["name"],
                display_order=biz_data["categories"].index(cat_data),
            )
            db.add(cat)
            db.flush()  # Get the ID

            # Create subcategories
            subcat_map: dict[str, CatalogueSubcategory] = {}
            for idx, sub_name in enumerate(cat_data.get("subcategories", [])):
                sub = CatalogueSubcategory(
                    category_id=cat.id,
                    name=sub_name,
                    display_order=idx,
                )
                db.add(sub)
                db.flush()
                subcat_map[sub_name] = sub

            # Create items
            for idx, item_data in enumerate(cat_data.get("items", [])):
                item = CatalogueItem(
                    category_id=cat.id,
                    subcategory_id=None,  # Can be assigned later
                    name=item_data["name"],
                    default_unit=item_data.get("unit", "Pcs"),
                    is_vegetarian=item_data.get("is_vegetarian"),
                    is_service=item_data.get("is_service", False),
                    tags=item_data.get("tags", ""),
                    display_order=idx,
                )
                db.add(item)

    db.flush()
