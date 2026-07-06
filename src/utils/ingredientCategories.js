import { callAI } from './aiClient.js'

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Seafood', 'Bakery', 'Frozen', 'Pantry', 'Spices', 'Beverages', 'Other']

const INGREDIENT_MAP = {
  // Produce
  'apple': 'Produce', 'apples': 'Produce',
  'banana': 'Produce', 'bananas': 'Produce',
  'orange': 'Produce', 'oranges': 'Produce',
  'lemon': 'Produce', 'lemons': 'Produce',
  'lime': 'Produce', 'limes': 'Produce',
  'tomato': 'Produce', 'tomatoes': 'Produce',
  'onion': 'Produce', 'onions': 'Produce',
  'garlic': 'Produce',
  'carrot': 'Produce', 'carrots': 'Produce',
  'celery': 'Produce',
  'potato': 'Produce', 'potatoes': 'Produce',
  'sweet potato': 'Produce', 'sweet potatoes': 'Produce',
  'broccoli': 'Produce',
  'spinach': 'Produce',
  'lettuce': 'Produce',
  'kale': 'Produce',
  'cucumber': 'Produce', 'cucumbers': 'Produce',
  'bell pepper': 'Produce', 'bell peppers': 'Produce',
  'zucchini': 'Produce',
  'mushroom': 'Produce', 'mushrooms': 'Produce',
  'avocado': 'Produce', 'avocados': 'Produce',
  'strawberry': 'Produce', 'strawberries': 'Produce',
  'blueberry': 'Produce', 'blueberries': 'Produce',
  'grape': 'Produce', 'grapes': 'Produce',
  'mango': 'Produce', 'mangoes': 'Produce',
  'pineapple': 'Produce',
  'ginger': 'Produce',
  'cilantro': 'Produce', 'parsley': 'Produce', 'basil': 'Produce', 'mint': 'Produce',
  'scallion': 'Produce', 'scallions': 'Produce', 'green onion': 'Produce', 'green onions': 'Produce',
  'jalapeño': 'Produce', 'jalapeno': 'Produce',
  'corn': 'Produce',
  'pea': 'Produce', 'peas': 'Produce',
  'asparagus': 'Produce',
  'cauliflower': 'Produce',
  'cabbage': 'Produce',
  'eggplant': 'Produce',

  // Dairy
  'milk': 'Dairy',
  'butter': 'Dairy',
  'cheese': 'Dairy', 'cheddar': 'Dairy', 'mozzarella': 'Dairy', 'parmesan': 'Dairy',
  'cream cheese': 'Dairy',
  'heavy cream': 'Dairy', 'heavy whipping cream': 'Dairy', 'whipping cream': 'Dairy',
  'sour cream': 'Dairy',
  'yogurt': 'Dairy', 'greek yogurt': 'Dairy',
  'half and half': 'Dairy',
  'egg': 'Dairy', 'eggs': 'Dairy',
  'cream': 'Dairy',
  'ricotta': 'Dairy', 'cottage cheese': 'Dairy',
  'condensed milk': 'Dairy', 'evaporated milk': 'Dairy',

  // Meat
  'chicken': 'Meat', 'chicken breast': 'Meat', 'chicken thigh': 'Meat',
  'beef': 'Meat', 'ground beef': 'Meat',
  'pork': 'Meat', 'bacon': 'Meat', 'ham': 'Meat',
  'turkey': 'Meat', 'ground turkey': 'Meat',
  'sausage': 'Meat',
  'lamb': 'Meat',
  'steak': 'Meat',
  'pepperoni': 'Meat',
  'prosciutto': 'Meat',
  'deli meat': 'Meat',

  // Seafood
  'salmon': 'Seafood', 'tuna': 'Seafood', 'shrimp': 'Seafood',
  'cod': 'Seafood', 'tilapia': 'Seafood', 'halibut': 'Seafood',
  'crab': 'Seafood', 'lobster': 'Seafood',
  'scallop': 'Seafood', 'scallops': 'Seafood',
  'clam': 'Seafood', 'clams': 'Seafood',
  'oyster': 'Seafood', 'oysters': 'Seafood',
  'sardine': 'Seafood', 'sardines': 'Seafood',
  'anchovy': 'Seafood', 'anchovies': 'Seafood',

  // Bakery
  'bread': 'Bakery', 'white bread': 'Bakery', 'whole wheat bread': 'Bakery',
  'bagel': 'Bakery', 'bagels': 'Bakery',
  'muffin': 'Bakery', 'muffins': 'Bakery',
  'croissant': 'Bakery', 'croissants': 'Bakery',
  'tortilla': 'Bakery', 'tortillas': 'Bakery',
  'pita': 'Bakery',
  'bun': 'Bakery', 'buns': 'Bakery',
  'roll': 'Bakery', 'rolls': 'Bakery',

  // Frozen
  'frozen peas': 'Frozen', 'frozen corn': 'Frozen',
  'frozen spinach': 'Frozen', 'frozen broccoli': 'Frozen',
  'ice cream': 'Frozen',
  'frozen pizza': 'Frozen',
  'frozen berries': 'Frozen',

  // Pantry
  'flour': 'Pantry', 'all-purpose flour': 'Pantry', 'whole wheat flour': 'Pantry',
  'sugar': 'Pantry', 'brown sugar': 'Pantry', 'powdered sugar': 'Pantry', 'confectioners sugar': 'Pantry',
  'salt': 'Pantry',
  'olive oil': 'Pantry', 'vegetable oil': 'Pantry', 'canola oil': 'Pantry', 'coconut oil': 'Pantry',
  'rice': 'Pantry', 'white rice': 'Pantry', 'brown rice': 'Pantry',
  'pasta': 'Pantry', 'spaghetti': 'Pantry', 'penne': 'Pantry', 'fettuccine': 'Pantry',
  'oats': 'Pantry', 'rolled oats': 'Pantry',
  'bread crumbs': 'Pantry', 'breadcrumbs': 'Pantry',
  'baking powder': 'Pantry', 'baking soda': 'Pantry',
  'vanilla extract': 'Pantry', 'vanilla': 'Pantry',
  'vinegar': 'Pantry', 'apple cider vinegar': 'Pantry', 'balsamic vinegar': 'Pantry', 'red wine vinegar': 'Pantry',
  'soy sauce': 'Pantry', 'worcestershire sauce': 'Pantry',
  'tomato sauce': 'Pantry', 'tomato paste': 'Pantry', 'crushed tomatoes': 'Pantry',
  'chicken broth': 'Pantry', 'beef broth': 'Pantry', 'vegetable broth': 'Pantry',
  'coconut milk': 'Pantry',
  'honey': 'Pantry', 'maple syrup': 'Pantry',
  'peanut butter': 'Pantry', 'almond butter': 'Pantry',
  'lentil': 'Pantry', 'lentils': 'Pantry',
  'bean': 'Pantry', 'beans': 'Pantry', 'black beans': 'Pantry', 'chickpeas': 'Pantry',
  'almond': 'Pantry', 'almonds': 'Pantry', 'walnut': 'Pantry', 'walnuts': 'Pantry', 'cashews': 'Pantry',
  'chocolate chips': 'Pantry', 'cocoa powder': 'Pantry',
  'cornstarch': 'Pantry',
  'yeast': 'Pantry',
  'hot sauce': 'Pantry',
  'mustard': 'Pantry',
  'ketchup': 'Pantry',
  'mayonnaise': 'Pantry',

  // Spices
  'black pepper': 'Spices', 'pepper': 'Spices',
  'cinnamon': 'Spices',
  'cumin': 'Spices',
  'paprika': 'Spices', 'smoked paprika': 'Spices',
  'turmeric': 'Spices',
  'oregano': 'Spices',
  'thyme': 'Spices',
  'rosemary': 'Spices',
  'bay leaf': 'Spices', 'bay leaves': 'Spices',
  'chili powder': 'Spices', 'cayenne': 'Spices', 'cayenne pepper': 'Spices',
  'garlic powder': 'Spices', 'onion powder': 'Spices',
  'nutmeg': 'Spices',
  'clove': 'Spices', 'cloves': 'Spices',
  'cardamom': 'Spices',
  'curry powder': 'Spices',
  'chili flakes': 'Spices', 'red pepper flakes': 'Spices',
  'italian seasoning': 'Spices',
  'allspice': 'Spices',
  'garam masala': 'Spices',
  'coriander': 'Spices',
  'dill': 'Spices',
  'sage': 'Spices',
  'tarragon': 'Spices',

  // Beverages
  'coffee': 'Beverages', 'espresso': 'Beverages',
  'tea': 'Beverages',
  'juice': 'Beverages', 'orange juice': 'Beverages', 'apple juice': 'Beverages',
  'wine': 'Beverages', 'white wine': 'Beverages', 'red wine': 'Beverages',
  'beer': 'Beverages',
  'water': 'Beverages', 'sparkling water': 'Beverages',
  'soda': 'Beverages',
}

export function lookupCategory(name) {
  if (!name) return null
  const lower = name.toLowerCase().trim()
  if (INGREDIENT_MAP[lower]) return INGREDIENT_MAP[lower]
  // Substring match: ingredient map key is contained in the name or vice versa
  for (const [key, cat] of Object.entries(INGREDIENT_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return cat
  }
  return null
}

export async function classifyBatchWithAI(names, settings) {
  if (!names || names.length === 0) return {}
  if (!settings?.aiApiKey) return {}

  const prompt = `Classify each of these ingredients into exactly one of: Produce, Dairy, Meat, Seafood, Bakery, Frozen, Pantry, Spices, Beverages, Other.\nIngredients: ${names.join(', ')}\nReply with JSON only: {"ingredient name": "Category", ...}`

  // Fire-and-forget classification: any failure just leaves items uncategorized.
  try {
    const responseText = await callAI(prompt, settings)

    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return {}
    const parsed = JSON.parse(jsonMatch[0])
    const result = {}
    for (const [name, cat] of Object.entries(parsed)) {
      result[name] = CATEGORIES.includes(cat) ? cat : 'Other'
    }
    return result
  } catch {
    return {}
  }
}
