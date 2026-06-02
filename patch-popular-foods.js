const fs = require("fs");
const path = "src/components/home/PopularFoods.tsx";
let code = fs.readFileSync(path, "utf8");

code = code.replace(/\{displayed\.map\(\(item\) => \(/g, "{displayed.map((item, index) => (");
code = code.replace(/<FoodCard key=\{item\.id\} item=\{item\} onOpenPopup=\{setPopupItemId\} \/>/g, "<FoodCard key={item.id} item={item} index={index} onOpenPopup={setPopupItemId} />");

const startStr = "function FoodCard({ item, onOpenPopup }: { item: FoodItem; onOpenPopup: (id: string) => void }) {";
const endStr = "export default function PopularFoods({";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find FoodCard or PopularFoods");
  process.exit(1);
}

const newFoodCard = `function FoodCard({ item, index, onOpenPopup }: { item: FoodItem; index: number; onOpenPopup: (id: string) => void }) {
  const { addItem, getItemQty } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const qty = getItemQty ? getItemQty(item.id) : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    addItem(
      { id: item.id, name: item.name, price: item.price, image: item.image },
      item.restaurantId,
      item.restaurantSlug
    );
    setTimeout(() => setIsAdding(false), 800);
  };

  const isLong = (index + 1) % 5 === 0;

  if (isLong) {
    return (
      <div 
        className="group relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2 cursor-pointer"
        onClick={() => onOpenPopup(item.id)}
      >
        <div className="relative aspect-[2/1] sm:aspect-[2.5/1] overflow-hidden w-full">
           <img
             src={item.image}
             alt={item.name}
             loading="lazy"
             decoding="async"
             className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
           <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase shadow-lg text-slate-800">
              {item.restaurantName || "Chef's Special"}
           </div>
           
           <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl flex items-center gap-1 shadow-lg">
              <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-[var(--accent)] text-[var(--accent)]" />
              <span className="text-[10px] sm:text-xs font-black text-slate-900">{item.rating.toFixed(1)}</span>
           </div>

           <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
             <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                   <div className={\`h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center rounded border-2 border-white/80 \${item.isVeg ? "bg-green-500/20" : "bg-red-500/20"}\`}>
                     <div className={\`h-1.5 w-1.5 rounded-full \${item.isVeg ? "bg-green-400" : "bg-red-400"}\`} />
                   </div>
                   <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md truncate">{item.name}</h3>
                </div>
                <div className="flex gap-3 text-white/90 text-[10px] sm:text-xs font-bold drop-shadow-md">
                   <span className="flex items-center gap-1"><Clock className="h-3 w-3 opacity-80"/> {item.prepTime}</span>
                   {item.tags && item.tags.length > 0 && (
                     <span className="hidden sm:inline-block truncate">| {item.tags[0]}</span>
                   )}
                </div>
             </div>
             
             <div className="flex flex-col items-end gap-2 pointer-events-auto">
                <div className="bg-[#0f172a] text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl flex items-center gap-2 shadow-xl shadow-[#0f172a]/20 hover:bg-[#1e293b] active:scale-95 transition-all" onClick={handleAdd}>
                   <span className="text-[14px] sm:text-[16px] font-black mr-1">{formatPrice(item.price, "NPR")}</span>
                   <div className="h-4 w-[1px] bg-white/20" />
                   {isAdding ? (
                     <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider ml-1 text-green-400">Added</span>
                   ) : (
                     <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider ml-1">Add</span>
                   )}
                </div>
             </div>
           </div>
        </div>
      </div>
    );
  }

  // The horizontal stacked Swiggy style shown in screenshot attached by user
  return (
    <div 
      className="group relative flex items-center gap-4 sm:gap-5 bg-white rounded-3xl p-3 shadow-sm border border-slate-100 hover:shadow-md hover:border-orange-100 transition-all duration-300 cursor-pointer w-full"
      onClick={() => onOpenPopup(item.id)}
    >
       {/* Left: Stacked images mimicking the screenshot */}
       <div className="relative shrink-0 w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] ml-4 my-1">
         {/* Shadow layers behind */}
         <div className="absolute inset-0 bg-[#2b2b2b] rounded-[1.25rem] scale-[0.85] -translate-x-[18px] sm:-translate-x-5 shadow-sm transition-transform duration-500 group-hover:-translate-x-[22px] sm:group-hover:-translate-x-6" />
         <div className="absolute inset-0 bg-[#a39485] rounded-[1.25rem] scale-[0.92] -translate-x-[9px] sm:-translate-x-2.5 shadow-sm transition-transform duration-500 group-hover:-translate-x-[12px] sm:group-hover:-translate-x-3.5" />
         
         <div className="relative z-10 w-full h-full rounded-[1.25rem] overflow-hidden bg-[var(--surface)] shadow-sm">
           <img
             src={item.image}
             alt={item.name}
             loading="lazy"
             className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
           />
           {item.isVeg !== undefined && (
             <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md p-[3px] rounded bg-white shadow-sm border border-slate-100/50">
                <div className={\`h-1.5 w-1.5 rounded-sm \${item.isVeg ? "bg-green-500" : "bg-red-500"}\`} />
             </div>
           )}
           {qty > 0 && (
             <div className="absolute top-2 right-2 bg-orange-500 text-white font-black text-[10px] h-5 w-5 flex items-center justify-center rounded-full shadow-lg border border-white">
               {qty}
             </div>
           )}
         </div>
       </div>

       {/* Right: Info */}
       <div className="flex-1 flex flex-col justify-center min-w-0 pr-2 sm:pr-3 py-1">
         <h3 className="text-[15px] sm:text-[16px] font-black text-slate-800 leading-tight mb-1 truncate">
           {item.name}
         </h3>

         <div className="flex items-center text-[11px] sm:text-[12px] text-slate-500 mb-2 font-semibold gap-1.5 line-clamp-1">
            <span className="truncate">{item.restaurantName || "Chef's Special"}</span>
            <span className="opacity-40 font-normal">|</span>
            <span className="shrink-0 flex items-center gap-0.5"><Clock className="h-3 w-3 opacity-60" /> {item.prepTime}</span>
         </div>

         <div className="flex items-center justify-between mt-auto pt-1 rounded-xl">
            <div className="text-[16px] sm:text-[18px] font-black text-orange-500 tracking-tight">
              {formatPrice(item.price, "NPR")}
            </div>

            <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
               <button
                 onClick={handleAdd}
                 className={\`uppercase px-4 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold tracking-wider transition-all \${
                   isAdding 
                     ? "bg-green-50 text-green-600 border border-green-200"
                     : "bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-500 hover:text-white"
                 }\`}
               >
                 {isAdding ? "Added" : "Add"}
               </button>
            </div>
         </div>
       </div>
    </div>
  );
}

`;

const newCode = code.slice(0, startIndex) + newFoodCard + code.slice(endIndex);
fs.writeFileSync(path, newCode, "utf8");
console.log("Patched successfully!");

