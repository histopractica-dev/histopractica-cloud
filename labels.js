// Catálogos de etiquetas para generar distractores (copia de los de la página).
const T={epi:"Tejido epitelial",con:"Tejido conjuntivo",adi:"Tejido adiposo",car:"Tejido cartilaginoso",oseo:"Tejido óseo",san:"Sangre",mus:"Tejido muscular",ner:"Tejido nervioso"};
const LB={epi:["Epitelio simple plano","Epitelio simple cúbico","Epitelio simple cilíndrico","Epitelio plano estratificado queratinizado","Epitelio plano estratificado no queratinizado","Epitelio plano estratificado paraqueratinizado","Epitelio cúbico estratificado","Epitelio cilíndrico estratificado","Epitelio pseudoestratificado","Urotelio (epitelio de transición)"],
con:["Tejido conjuntivo laxo","Tejido conjuntivo denso irregular","Tejido conjuntivo denso regular","Mesénquima","Tejido conjuntivo mucoso"],
adi:["Tejido adiposo blanco (unilocular)","Tejido adiposo pardo (multilocular)"],car:["Cartílago hialino","Cartílago elástico","Fibrocartílago"],
oseo:["Hueso compacto","Hueso esponjoso"],san:["Frotis sanguíneo"],mus:["Músculo estriado esquelético","Músculo estriado cardiaco","Músculo liso"],
ner:["Neuronas (tinción de Golgi)","Corteza cerebral (neuronas y neuroglia)","Epitelio ependimario"]};
const CE={san:["Eritrocito","Neutrófilo","Eosinófilo","Basófilo","Linfocito","Monocito","Plaqueta","Célula plasmática","Neutrófilo en banda","Reticulocito"],con:["Fibroblasto","Fibrocito","Macrófago","Mastocito","Célula plasmática","Adipocito","Célula mesenquimatosa"],adi:["Adipocito","Adipocito multilocular","Fibroblasto","Célula endotelial","Macrófago"],
car:["Condrocito","Condroblasto","Célula condrogénica","Fibroblasto"],oseo:["Osteocito","Osteoblasto","Osteoclasto","Célula osteoprogenitora"],mus:["Fibra muscular esquelética","Cardiomiocito","Célula muscular lisa"],
ner:["Neurona","Astrocito","Oligodendrocito","Microglía","Célula ependimaria"],epi:["Célula epitelial","Célula caliciforme","Célula basal","Célula ciliada","Célula en paraguas (urotelio)","Célula endotelial"]};
const ES={epi:["Membrana basal","Luz","Tejido conectivo subyacente","Cilios","Microvellosidades (borde en cepillo)","Estrato córneo"],con:["Fibras colágenas","Sustancia fundamental","Núcleo de fibroblasto"],adi:["Adipocito","Capilar","Núcleo del adipocito"],
car:["Condrocito","Laguna","Grupo isógeno","Matriz territorial","Matriz interterritorial","Pericondrio"],oseo:["Osteona","Conducto de Havers","Sistemas intersticiales","Periostio","Endostio","Laguna"],
san:["Núcleo multilobulado","Gránulos citoplasmáticos","Palidez central","Núcleo arriñonado","Núcleo excéntrico","Halo perinuclear (Golgi)","Citoplasma basófilo"],mus:["Disco intercalar","Endomisio","Perimisio","Núcleo periférico","Fascículo muscular"],ner:["Soma","Dendritas","Axón","Plexo coroideo","Epitelio ependimario","Neuropilo"]};
const REL={san:["con"],con:["san","adi"],adi:["con"],car:["oseo","con"],oseo:["car","con"],mus:["con"],ner:["epi"],epi:["con"]};

module.exports={T,LB,CE,ES,REL};
