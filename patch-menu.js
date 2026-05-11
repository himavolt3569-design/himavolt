const fs = require("fs");
const path = "src/app/menu/[slug]/page.tsx";
let code = fs.readFileSync(path, "utf8");

// 1. Add index prop to usages of MenuItemCard
code = code.replace(/\{specials\.map\(\(item\) => \(/g, "{specials.map((item, index) => (");
code = code.replace(/\{smartSorted\.map\(\(item\) => \(/g, "{smartSorted.map((item, index) => (");
code = code.replace(/\{catItems\.map\(\(item\) => \(/g, "{catItems.map((item, index) => (");
code = code.replace(/\.filter\([\s\S]*?\)\s*\.map\(\(item\) => \(/g, match => {
  return match.replace(".map((item) => (", ".map((item, index) => (");
});
code = code.replace(/<MenuItemCard\s+key=\{/g, "<MenuItemCard index={index} key={");


// 2. Replace MenuItemCard definition
const startStr = "function MenuItemCard({";
const endStr = "function HeroDish({";
const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find MenuItemCard or HeroDish");
  process.exit(1);
}

const newMenuItemCard = `function MenuItemCard({
  item,
  restaurantId,
  restaurantSlug,
  restaurantCurrency,
  onSelect,
  surgeMultiplier = 1,
  index = 0,
}: {
  item: MenuItem;
  restaurantId: string;
  restaurantSlug: string;
  restaurantCurrency: string;
  onSelect: (item: MenuItem) => void;
  surgeMultiplier?: number;
  index?: number;
}) {
  const { addItem, getItemQty } = useCart();
  const { showToast } = useToast();
  const btnRef = useRef<HTMLButtonElement>(null);
  const qty = getItemQty(item.id);
  const displayPrice = Math.round(item.price * surgeMultiplier);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(
      {
        id: item.id,
        name: item.name,
        price: displayPrice,
        image: img(item.imageUrl),
      },
      restaurantId,
      restaurantSlug,
      restaurantCurrency,
    );
    showToast(\`\${item.name} added!\`);
    if (btnRef.current) {
      const target = btnRef.current;
      loadGsap().then((gsap) => {
        gsap.fromTo(
          target,
          { scale: 1.35 },
          { scale: 1, duration: 0.3, ease: "back.out(3)" },
        );
      });
    }
  };

  // Every 6th item is a longer feature card
  const isLong = (index + 1) % 6 === 0;

  if (isLong) {
    return (
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -3 }}
        className="group relative overflow-hidden rounded-3xl bg-[var(--canvas)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] border border-gray-100 mb-4 cursor-pointer"
        onClick={() => onSelect(item)}
      >
        <div className="relative h-48 sm:h-56 w-full overflow-hidden shrink-0">
          <img
            src={img(item.imageUrl)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            alt={item.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
          
          {item.badge && (
            <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-black shadow-lg">
              {item.badge}
            </span>
          )}
          
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-1.5 mb-1 text-white">
                {item.isVeg ? (
                  <span className="h-3.5 w-3.5 bg-green-500 rounded-sm border-2 border-white shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 bg-red-500 rounded-sm border-2 border-white shrink-0" />
                )}
                <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-none drop-shadow-md text-white line-clamp-1">
                  {stripEmojis(item.name)}
                </h3>
              </div>
              <div className="flex gap-3 text-[11px] sm:text-xs text-white/90 font-bold drop-shadow-md">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {item.prepTime}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                  {item.rating.toFixed(1)}
                </span>
                {item.tags && item.tags.length > 0 && (
                  <span className="hidden sm:inline-block truncate">| {item.tags.join(", ")}</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end shrink-0 gap-2">
              <span className="text-2xl font-black text-[#F26422] bg-black/60 px-3 py-1 rounded-xl backdrop-blur-sm shadow-xl border border-white/10">
                {formatPrice(displayPrice, restaurantCurrency)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-[var(--canvas)] flex items-center justify-between gap-4">
          <div className="text-[12px] sm:text-[13px] text-[var(--text-3)] line-clamp-2 leading-relaxed flex-1 font-medium">
            {item.description || "Fresh and delicious automatically prepared description for you to enjoy!"}
          </div>
          
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {item.outOfStock ? (
               <div className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold uppercase tracking-wider">
                 Out of stock
               </div>
            ) : qty > 0 ? (
               <div className="flex items-center gap-2 bg-[#F26422]/10 border border-[#F26422]/20 rounded-xl px-4 py-2">
                  <span className="font-extrabold text-[15px] text-[#F26422]">{qty} items</span>
               </div>
            ) : (
               <button
                 ref={btnRef}
                 onClick={handleQuickAdd}
                 className="flex items-center gap-1 bg-[#F26422] hover:bg-[#d9561c] text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-md transition-colors uppercase tracking-wider"
               >
                 Add <Plus className="h-4 w-4" strokeWidth={3} />
               </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // DEFAULT SWIGGY STACKED STYLE
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      className="group relative flex items-stretch justify-between bg-white rounded-3xl p-3 sm:p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] border border-gray-100 mb-4 cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="relative shrink-0 w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] ml-3 sm:ml-4 my-auto">
        <div className="absolute inset-0 bg-[#2b2b2b] rounded-2xl scale-[0.88] -translate-x-4 sm:-translate-x-5 shadow-sm transition-transform duration-500 group-hover:-translate-x-6" />
        <div className="absolute inset-0 bg-[#a39485] rounded-2xl scale-[0.94] -translate-x-2 sm:-translate-x-2.5 shadow-sm transition-transform duration-500 group-hover:-translate-x-3.5" />
        
        <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden shadow-md bg-[var(--surface)]">
          <img
            src={img(item.imageUrl)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            decoding="async"
            alt={item.name}
          />
          {qty > 0 && (
            <div className="absolute top-2 right-2 bg-[#F26422] text-white font-black text-[11px] h-6 w-6 flex items-center justify-center rounded-full shadow-lg border-2 border-white">
              {qty}
            </div>
          )}
          {item.isVeg !== undefined && (
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md p-1 rounded-md shadow-sm">
               {item.isVeg ? (
                 <div className="h-2.5 w-2.5 bg-green-500 rounded-sm" />
               ) : (
                 <div className="h-2.5 w-2.5 bg-red-500 rounded-sm" />
               )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center pl-5 sm:pl-6 pr-1 sm:pr-2 py-1 relative">
        <h3 className="text-[15px] sm:text-[17px] font-black text-gray-900 leading-tight mb-1.5 sm:mb-2 line-clamp-2">
          {stripEmojis(item.name)}
        </h3>
        
        <div className="flex items-center flex-wrap text-[11px] sm:text-[12px] font-semibold text-gray-500 mb-2 sm:mb-3 gap-1.5">
          <span className="truncate max-w-[100px] sm:max-w-[140px]">
             {item.sizes && item.sizes.length > 0 ? \`\${item.sizes.length} options\` : (item.tags?.[0] || item.category?.name || "Dish")}
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-0.5 shrink-0">
             <Clock className="h-3 w-3" />
             {item.prepTime}
          </span>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col">
             {surgeMultiplier > 1 && (
                <span className="text-[10px] text-gray-400 line-through mb-0.5">
                  {formatPrice(item.price, restaurantCurrency)}
                </span>
             )}
             <span className="text-[16px] sm:text-[18px] font-black text-[#F26422]">
                {formatPrice(displayPrice, restaurantCurrency)}
             </span>
          </div>
          
          <div onClick={(e) => e.stopPropagation()} className="shrink-0 ml-2">
            {item.outOfStock ? (
               <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                 Out
               </span>
            ) : qty === 0 ? (
               <button
                 ref={btnRef}
                 onClick={handleQuickAdd}
                 className="uppercase px-4 py-1.5 bg-white border-2 border-[#F26422] text-[#F26422] rounded-xl text-[12px] sm:text-[13px] font-black shadow-sm hover:bg-orange-50 transition-colors"
               >
                 Add
               </button>
            ) : (
               <div className="flex items-center justify-center px-4 py-1.5 bg-[#F26422] text-white rounded-xl text-[12px] sm:text-[13px] font-black shadow-sm border-2 border-[#F26422]">
                 {qty}
               </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

`;

const newCode = code.slice(0, startIndex) + newMenuItemCard + code.slice(endIndex);
fs.writeFileSync(path, newCode, "utf8");
console.log("Patched successfully!");

