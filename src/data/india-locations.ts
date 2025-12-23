/**
 * India Location Master Data
 * Single source of truth for all district/mandal/village dropdowns
 * DO NOT modify structure or values - use AS-IS
 */

export interface Village {
  code: string;
  name: string;
}

export interface Mandal {
  code: string;
  name: string;
  villages: Village[];
}

export interface Subdivision {
  code: string;
  name: string;
  mandals: Mandal[];
}

export interface District {
  code: string;
  name: string;
  subdivisions: Subdivision[];
}

export interface LocationData {
  districts: District[];
}

export const INDIA_LOCATIONS: LocationData = {
  "districts": [
    {
      "code": "505",
      "name": "East Godavari",
      "subdivisions": [
        {
          "code": "41",
          "name": "ANAPARTHY",
          "mandals": [
            {
              "code": "4917",
              "name": "Anaparthi",
              "villages": [
                { "code": "587541", "name": "Anaparthy" },
                { "code": "587540", "name": "Duppalapudi" },
                { "code": "587542", "name": "Koppavaram" },
                { "code": "587546", "name": "Kutukuluru" },
                { "code": "912442", "name": "Laxmi Narasapuram" },
                { "code": "587543", "name": "Mahendrawada" },
                { "code": "587547", "name": "Pedaparthi" },
                { "code": "912441", "name": "Pera Ramachandrapuram" },
                { "code": "587544", "name": "Polamuru" },
                { "code": "587548", "name": "Pulagurtha" },
                { "code": "587545", "name": "Ramavaram" }
              ]
            },
            {
              "code": "4916",
              "name": "Biccavolu",
              "villages": [
                { "code": "587538", "name": "Arikarevula" },
                { "code": "587531", "name": "Balabhadrapuram" },
                { "code": "587530", "name": "Biccavolu" },
                { "code": "587527", "name": "Illapalle" },
                { "code": "587532", "name": "Kapavaram" },
                { "code": "587533", "name": "Komaripalem" },
                { "code": "587537", "name": "Konkuduru" },
                { "code": "587539", "name": "Melluru" },
                { "code": "587535", "name": "Pandalapaka" },
                { "code": "587529", "name": "Rallakhandrika" },
                { "code": "587526", "name": "Rangapuram" },
                { "code": "587528", "name": "Thummalapalle" },
                { "code": "587534", "name": "Tossipudi" },
                { "code": "587536", "name": "Voolapalle" }
              ]
            },
            {
              "code": "4909",
              "name": "Rangampeta",
              "villages": [
                { "code": "587431", "name": "Doddigunta" },
                { "code": "587428", "name": "Elakolanu" },
                { "code": "587430", "name": "G. Donthamuru" },
                { "code": "587424", "name": "Kotapadu" },
                { "code": "587432", "name": "Marripudi" },
                { "code": "587427", "name": "Mukundavaram" },
                { "code": "587434", "name": "Nallamilli" },
                { "code": "587423", "name": "Pedarayavaram" },
                { "code": "587422", "name": "Rangampeta" },
                { "code": "587433", "name": "Singampalle" },
                { "code": "587420", "name": "South Thirupathi Rajapuram" },
                { "code": "587426", "name": "Subhadrampeta" },
                { "code": "587421", "name": "Vadisaleru" },
                { "code": "587429", "name": "Veerampalem" },
                { "code": "587425", "name": "Venkatapuram" }
              ]
            }
          ]
        },
        {
          "code": "42",
          "name": "KORUKONDA",
          "mandals": [
            {
              "code": "4897",
              "name": "Gokavaram",
              "villages": [
                { "code": "587228", "name": "Atchutapuram" },
                { "code": "587236", "name": "Bhupatipalem" },
                { "code": "587227", "name": "Gadelapalem" },
                { "code": "912440", "name": "Gangampalem" },
                { "code": "587225", "name": "Gokavaram" },
                { "code": "587229", "name": "Gummalladuddi" },
                { "code": "912437", "name": "Itikayala Palle" },
                { "code": "587235", "name": "Kalijolla" },
                { "code": "912439", "name": "Kamaraju Peta" },
                { "code": "587224", "name": "Kothapalle" },
                { "code": "587223", "name": "Krishnunipalem" },
                { "code": "587234", "name": "Mallavaram" },
                { "code": "587230", "name": "Rampa Yerrampalem" },
                { "code": "587233", "name": "Sivaramapatnam" },
                { "code": "587232", "name": "Sudikonda" },
                { "code": "587231", "name": "Takurupalem" },
                { "code": "587226", "name": "Thantikonda" },
                { "code": "587237", "name": "Tirumalayapalem" },
                { "code": "912438", "name": "Vedurupaka" }
              ]
            },
            {
              "code": "4905",
              "name": "Korukonda",
              "villages": [
                { "code": "587376", "name": "Bodleddupalem" },
                { "code": "587387", "name": "Burugupudi" },
                { "code": "587390", "name": "Butchempeta" },
                { "code": "587386", "name": "Dosakayalapalle" },
                { "code": "587392", "name": "Gadala" },
                { "code": "587384", "name": "Gadarada" },
                { "code": "587381", "name": "Jambupatnam" },
                { "code": "587383", "name": "Kanupuru" },
                { "code": "587388", "name": "Kapavaram" },
                { "code": "587380", "name": "Korukonda" },
                { "code": "587375", "name": "Koti" },
                { "code": "587377", "name": "Kotikesavaram" },
                { "code": "587391", "name": "Madhurapudi" },
                { "code": "587389", "name": "Munagala" },
                { "code": "587382", "name": "Narasapuram" },
                { "code": "587385", "name": "Narasimhapura Agraharam" },
                { "code": "587393", "name": "Nidigatla" },
                { "code": "587378", "name": "Raghavapuram" },
                { "code": "587379", "name": "Srirangapatnam" }
              ]
            },
            {
              "code": "4896",
              "name": "Seethanagaram",
              "villages": [
                { "code": "587219", "name": "Bobbillanka" },
                { "code": "587210", "name": "Chinakondepudi" },
                { "code": "587222", "name": "Hundeswarapuram" },
                { "code": "587218", "name": "Jalimudi" },
                { "code": "587217", "name": "Katavaram" },
                { "code": "587215", "name": "Kunavaram" },
                { "code": "587221", "name": "Mirthipadu" },
                { "code": "587214", "name": "Muggaulla" },
                { "code": "587220", "name": "Mulakallanka" },
                { "code": "587216", "name": "Munikudali" },
                { "code": "587211", "name": "Nagampalle" },
                { "code": "587212", "name": "Nallagonda" },
                { "code": "587206", "name": "Purushothapatnam" },
                { "code": "587213", "name": "Raghudevapuram" },
                { "code": "587209", "name": "Seethanagaram" },
                { "code": "587208", "name": "Singavaram" },
                { "code": "587207", "name": "Vangalapudi" }
              ]
            }
          ]
        },
        {
          "code": "43",
          "name": "KOVVUR",
          "mandals": [
            {
              "code": "4956",
              "name": "Nallajerla",
              "villages": [
                { "code": "588241", "name": "Ananthapalle" },
                { "code": "588239", "name": "Anumunilanka" },
                { "code": "588250", "name": "Avapadu" },
                { "code": "588246", "name": "Cheepurugudem" },
                { "code": "588245", "name": "Chodavaram (West)" },
                { "code": "588248", "name": "Dubacherla" },
                { "code": "588244", "name": "Gundepalle @ Chodavaram(East)" },
                { "code": "588249", "name": "Marellamudi" },
                { "code": "588247", "name": "Nallajerla" },
                { "code": "588240", "name": "Pothavaram" },
                { "code": "588251", "name": "Prakasaraopalem" },
                { "code": "588242", "name": "Sanjeevapuram" },
                { "code": "588252", "name": "Telikicherla" },
                { "code": "588243", "name": "Veeravalli" }
              ]
            },
            {
              "code": "4959",
              "name": "Chagallu",
              "villages": [
                { "code": "588291", "name": "Brahmanagudem" },
                { "code": "588283", "name": "Chagallu" },
                { "code": "588282", "name": "Chikkala" },
                { "code": "588292", "name": "Daravaram" },
                { "code": "588289", "name": "Kalavalapalle" },
                { "code": "588285", "name": "Mallavaram" },
                { "code": "588286", "name": "Markondapadu" },
                { "code": "588287", "name": "Nandigampadu" },
                { "code": "588284", "name": "Nelaturu" },
                { "code": "588290", "name": "Singanamuppavaram" },
                { "code": "588288", "name": "Unagatla" }
              ]
            },
            {
              "code": "4957",
              "name": "Devarapalle",
              "villages": [
                { "code": "588262", "name": "Bandapuram" },
                { "code": "588254", "name": "Chinnayagudem" },
                { "code": "588260", "name": "Devarapalle" },
                { "code": "588259", "name": "Dhumanthunigudem" },
                { "code": "588263", "name": "Duddukuru" },
                { "code": "588264", "name": "Gowripatnam" },
                { "code": "588265", "name": "Kondagudem" },
                { "code": "588257", "name": "Kurukuru" },
                { "code": "588261", "name": "Laxmipuram" },
                { "code": "588258", "name": "Pallantlai" },
                { "code": "588256", "name": "Tyajampudi" },
                { "code": "588253", "name": "Yadavole" },
                { "code": "588255", "name": "Yernagudem" }
              ]
            },
            {
              "code": "4951",
              "name": "Gopalapuram",
              "villages": [
                { "code": "588134", "name": "Bhimolu" },
                { "code": "588147", "name": "Cherukumilli" },
                { "code": "588145", "name": "Chityala" },
                { "code": "588131", "name": "Dondapudi" },
                { "code": "588140", "name": "Gangavaram" },
                { "code": "588132", "name": "Gangolu" },
                { "code": "588143", "name": "Gopalapuram" },
                { "code": "588136", "name": "Guddigudem" },
                { "code": "588139", "name": "Jagannadhapuram" },
                { "code": "588129", "name": "Karagapadu" },
                { "code": "588138", "name": "Karicharlagudem" },
                { "code": "588141", "name": "Komatigunta" },
                { "code": "588135", "name": "Kovvurupadu" },
                { "code": "588137", "name": "Nandigudem" },
                { "code": "588133", "name": "Saggonda" },
                { "code": "588130", "name": "Sagipadu" },
                { "code": "588142", "name": "Vadalakunta" },
                { "code": "588144", "name": "Vellachintalagudem" },
                { "code": "588146", "name": "Venkatayapalem" }
              ]
            },
            {
              "code": "4958",
              "name": "Kovvur",
              "villages": [
                { "code": "588273", "name": "Arikirevula" },
                { "code": "588271", "name": "Chidipi" },
                { "code": "588280", "name": "Chigurulanka" },
                { "code": "588266", "name": "Decherla" },
                { "code": "588269", "name": "Dharmavaram" },
                { "code": "588268", "name": "Dommeru" },
                { "code": "588267", "name": "Isukapatlapangidi" },
                { "code": "931010", "name": "Kovvur" },
                { "code": "588272", "name": "Kumaradevam" },
                { "code": "588279", "name": "Madduru" },
                { "code": "588281", "name": "Maddurulanka" },
                { "code": "588274", "name": "Nandamuru" },
                { "code": "588275", "name": "Pasivedala" },
                { "code": "588270", "name": "Penakanametta" },
                { "code": "588277", "name": "Thogummi" },
                { "code": "588278", "name": "Vadapalle" },
                { "code": "588276", "name": "Vemuluru" }
              ]
            },
            {
              "code": "4960",
              "name": "Nidadavole",
              "villages": [
                { "code": "588293", "name": "Ammepalle" },
                { "code": "588309", "name": "Atlapadu" },
                { "code": "588308", "name": "D.Muppavaram" },
                { "code": "588304", "name": "Gopavaram" },
                { "code": "588316", "name": "Jeedigunta" },
                { "code": "588315", "name": "Jeediguntalanka" },
                { "code": "588311", "name": "J.Khandrika" },
                { "code": "588314", "name": "Kalavacherla" },
                { "code": "588295", "name": "Korumamidi" },
                { "code": "588317", "name": "Korupalle" },
                { "code": "588294", "name": "Medipalle" },
                { "code": "588313", "name": "Munipalle" },
                { "code": "588303", "name": "Nidadavole (R)" },
                { "code": "588307", "name": "Pandalaparru" },
                { "code": "588318", "name": "Pendyala" },
                { "code": "588306", "name": "Purushothapalle" },
                { "code": "588299", "name": "Ravimetla" },
                { "code": "588300", "name": "Sankarapuram" },
                { "code": "588312", "name": "Settipeta" },
                { "code": "588310", "name": "Singavaram" },
                { "code": "588301", "name": "Surapuram" },
                { "code": "588297", "name": "Tadimalla" },
                { "code": "588302", "name": "Thimmarajupalem" },
                { "code": "588298", "name": "Unakaramilli" },
                { "code": "588305", "name": "Vijjeswaram" },
                { "code": "588296", "name": "Vissampalem" }
              ]
            },
            {
              "code": "4971",
              "name": "Peravali",
              "villages": [
                { "code": "588533", "name": "Ajjaram" },
                { "code": "588532", "name": "Kakaraparru" },
                { "code": "588528", "name": "Kanuru" },
                { "code": "588529", "name": "Kanuruagraharam" },
                { "code": "588535", "name": "Kapavaram" },
                { "code": "588538", "name": "Khandavalli" },
                { "code": "588536", "name": "Kothapalle Agraharam" },
                { "code": "588539", "name": "Malleswaram" },
                { "code": "588537", "name": "Mukkamala" },
                { "code": "588527", "name": "Nadupalle" },
                { "code": "588534", "name": "Peravali" },
                { "code": "588540", "name": "Pittalavemavaram" },
                { "code": "588531", "name": "Teeparru" },
                { "code": "588530", "name": "Usulumarru" }
              ]
            },
            {
              "code": "4950",
              "name": "Tallapudi",
              "villages": [
                { "code": "588118", "name": "Annadevarapeta" },
                { "code": "588123", "name": "Ballipadu" },
                { "code": "588110", "name": "Bayyavaram" },
                { "code": "588117", "name": "Gajjaram" },
                { "code": "588120", "name": "Kukunuru" },
                { "code": "588127", "name": "Malakapalle" },
                { "code": "588126", "name": "Nallamillipadu" },
                { "code": "588115", "name": "Paidimetta" },
                { "code": "588124", "name": "Peddevam" },
                { "code": "588114", "name": "Pochavaram" },
                { "code": "588116", "name": "Prakkilanka" },
                { "code": "588112", "name": "Ragolapalle" },
                { "code": "588128", "name": "Ravurupadu" },
                { "code": "588111", "name": "Thadipudi" },
                { "code": "588121", "name": "Thallapudi" },
                { "code": "588113", "name": "Thupakulagudem" },
                { "code": "588125", "name": "Tirugudumetta" },
                { "code": "588119", "name": "Veerabhadrapuram" },
                { "code": "588122", "name": "Vegeswarapuram" }
              ]
            },
            {
              "code": "4970",
              "name": "Undrajavaram",
              "villages": [
                { "code": "588516", "name": "Chilakapadu" },
                { "code": "588521", "name": "Chivatam" },
                { "code": "588514", "name": "Dammennu" },
                { "code": "588512", "name": "Kaldhari" },
                { "code": "588522", "name": "Karravarisavaram" },
                { "code": "588515", "name": "Mortha" },
                { "code": "588523", "name": "Palangi" },
                { "code": "588517", "name": "Pasalapudi" },
                { "code": "588520", "name": "Satyawada" },
                { "code": "588518", "name": "Suryaraopalem" },
                { "code": "588526", "name": "Tadiparru" },
                { "code": "588524", "name": "Undrajavaram" },
                { "code": "588519", "name": "Vadluru" },
                { "code": "588525", "name": "Velagadurru" },
                { "code": "588513", "name": "Velivennu" }
              ]
            }
          ]
        },
        {
          "code": "44",
          "name": "RAJAMAHENDRAVARAM",
          "mandals": [
            {
              "code": "4918",
              "name": "Kadiam",
              "villages": [
                { "code": "587552", "name": "Damireddipalle" },
                { "code": "587555", "name": "Dulla" },
                { "code": "587551", "name": "Jegurupadu" },
                { "code": "587550", "name": "Kadiam" },
                { "code": "587554", "name": "Muramanda" },
                { "code": "587553", "name": "Veeravaram" },
                { "code": "587549", "name": "Vemagiri" }
              ]
            },
            {
              "code": "4907",
              "name": "Rajamahendravaram Rural",
              "villages": [
                { "code": "587401", "name": "Bommuru (Og)" },
                { "code": "587400", "name": "Dowleswaram (Ct)" },
                { "code": "587399", "name": "Hukumpeta (Ct)" },
                { "code": "587397", "name": "Katheru (Ct)" },
                { "code": "587395", "name": "Kolamuru" },
                { "code": "587398", "name": "Morampudi (Ct)" },
                { "code": "912435", "name": "Pidimgoyyi" },
                { "code": "587402", "name": "Rajahmundry Nma (Og)" },
                { "code": "587396", "name": "Rajavolu" },
                { "code": "912434", "name": "Satelite City" },
                { "code": "587394", "name": "Torredu" }
              ]
            },
            {
              "code": "4908",
              "name": "Rajanagaram",
              "villages": [
                { "code": "587413", "name": "Bhupalapatnam" },
                { "code": "587416", "name": "G. Yerrampalem" },
                { "code": "587409", "name": "Jagannadhapuram Agraharam" },
                { "code": "587404", "name": "Kalavacherla" },
                { "code": "587410", "name": "Kanavaram" },
                { "code": "587415", "name": "Konda Gunturu" },
                { "code": "587419", "name": "Mukkinada" },
                { "code": "587414", "name": "Namavaram" },
                { "code": "587403", "name": "Nandarada" },
                { "code": "587406", "name": "Narendrapuram" },
                { "code": "587412", "name": "Palacharla" },
                { "code": "587417", "name": "Patha Thungapadu" },
                { "code": "587405", "name": "Rajanagaram" },
                { "code": "587411", "name": "Srikrishnapatnam" },
                { "code": "587418", "name": "Thokada" },
                { "code": "587407", "name": "Velugubanda" },
                { "code": "587408", "name": "Venkatapuram" }
              ]
            },
            {
              "code": "4906",
              "name": "Rajamahendravaram Urban",
              "villages": [
                { "code": "930965", "name": "Rajajmundry Urban" }
              ]
            }
          ]
        }
      ]
    },
    {
      "code": "749",
      "name": "NTR",
      "subdivisions": [
        {
          "code": "80",
          "name": "JAGGAYYAPETA",
          "mandals": [
            {
              "code": "4991",
              "name": "Jaggaiahpeta",
              "villages": [
                { "code": "588845", "name": "Annavaram" },
                { "code": "588842", "name": "Anumanchipalle" },
                { "code": "588844", "name": "Balusupadu" },
                { "code": "588857", "name": "Bandipalem" },
                { "code": "588837", "name": "Buchavaram" },
                { "code": "588846", "name": "Budawada" },
                { "code": "588849", "name": "Chillakallu" },
                { "code": "588836", "name": "Gandrai" },
                { "code": "588843", "name": "Garikapadu" },
                { "code": "588850", "name": "Gowravaram" },
                { "code": "929834", "name": "Jaggayyapeta Urban" },
                { "code": "588852", "name": "Jayanthipuram" },
                { "code": "588853", "name": "Kowthavari Agraharam" },
                { "code": "588838", "name": "Malkapuram" },
                { "code": "588854", "name": "Mukteswarapuram" },
                { "code": "588851", "name": "Pochampalle" },
                { "code": "588835", "name": "Ramachandrunipeta" },
                { "code": "588840", "name": "Ravikampadu" },
                { "code": "588855", "name": "Ravirala" },
                { "code": "588841", "name": "Shermohammedpet" },
                { "code": "588834", "name": "Takkellapadu" },
                { "code": "588839", "name": "Tirumalagiri" },
                { "code": "588848", "name": "Torraguntapalem" },
                { "code": "588847", "name": "Tripuravaram" },
                { "code": "588856", "name": "Vedadri" }
              ]
            },
            {
              "code": "4992",
              "name": "Penuganchiprolu",
              "villages": [
                { "code": "588861", "name": "Anigandlapadu" },
                { "code": "588862", "name": "Gummadidurru" },
                { "code": "588864", "name": "Kollikulla" },
                { "code": "588867", "name": "Konakanchi" },
                { "code": "588858", "name": "Lingagudem" },
                { "code": "588860", "name": "Muchintala @ Bodapadu" },
                { "code": "588866", "name": "Mundlapadu" },
                { "code": "588868", "name": "Nawabpeta" },
                { "code": "588859", "name": "Penuganchiprolu" },
                { "code": "588870", "name": "Sanagapadu" },
                { "code": "588865", "name": "Subbayagudem" },
                { "code": "588869", "name": "Thotacherla" },
                { "code": "588863", "name": "Venkatapuram" }
              ]
            },
            {
              "code": "4990",
              "name": "Vatsavai",
              "villages": [
                { "code": "588826", "name": "Allurupadu" },
                { "code": "588821", "name": "Bhimavaram" },
                { "code": "588816", "name": "China Modugapalle" },
                { "code": "588824", "name": "Chittela" },
                { "code": "588809", "name": "Dabbakupalle" },
                { "code": "588819", "name": "Dechupalem" },
                { "code": "588811", "name": "Gangavalli" },
                { "code": "588817", "name": "Gopinenipalem" },
                { "code": "588823", "name": "Hasanabada" },
                { "code": "588814", "name": "Indugapalle" },
                { "code": "588829", "name": "Kakaravai" },
                { "code": "588832", "name": "Kambampadu" },
                { "code": "588813", "name": "Kanneveedu" },
                { "code": "588810", "name": "Lingala" },
                { "code": "588830", "name": "Machinenipalem" },
                { "code": "588822", "name": "Makkapeta" },
                { "code": "588818", "name": "Mangollu" },
                { "code": "588815", "name": "Peda Modugapalle" },
                { "code": "588812", "name": "Pochavaram" },
                { "code": "588808", "name": "Polampalle" },
                { "code": "588833", "name": "Rebbavaram" },
                { "code": "588831", "name": "Talluru" },
                { "code": "588827", "name": "Vatsavai" },
                { "code": "588820", "name": "Veerabhadrunipalem" },
                { "code": "588825", "name": "Vemavaram" },
                { "code": "588828", "name": "Vemulanarva" }
              ]
            }
          ]
        },
        {
          "code": "81",
          "name": "MYLAVARAM",
          "mandals": [
            {
              "code": "5006",
              "name": "Gaddamanugu Konduru",
              "villages": [
                { "code": "589141", "name": "Atukuru" },
                { "code": "589139", "name": "Bhimavarappadu" },
                { "code": "589150", "name": "Chegireddipadu" },
                { "code": "589130", "name": "Cheruvu Madhavaram" },
                { "code": "589133", "name": "Chevuturu" },
                { "code": "589124", "name": "Duggiralapadu" },
                { "code": "589131", "name": "Gaddamanugu" },
                { "code": "589126", "name": "Ganginenipalem" },
                { "code": "589135", "name": "Gurrajupalem" },
                { "code": "589148", "name": "Haveli Mutyalampadu" },
                { "code": "589144", "name": "Kadimpothavaram" },
                { "code": "589149", "name": "Kandulapadu" },
                { "code": "589145", "name": "Kavuluru" },
                { "code": "589138", "name": "Koduru" },
                { "code": "589132", "name": "Konduru" },
                { "code": "589136", "name": "Kuntamukkala" },
                { "code": "589143", "name": "Loya" },
                { "code": "589129", "name": "Munagapadu" },
                { "code": "589137", "name": "Nandigama" },
                { "code": "589146", "name": "Narasayagudem" },
                { "code": "589125", "name": "Petrampadu" },
                { "code": "589142", "name": "Pinapaka" },
                { "code": "589128", "name": "Sunnampadu" },
                { "code": "589127", "name": "Telladevarapadu" },
                { "code": "589147", "name": "Velagaleru" },
                { "code": "589140", "name": "Vellaturu" },
                { "code": "589134", "name": "Venkatapuram" }
              ]
            },
            {
              "code": "5009",
              "name": "Ibrahimpatnam",
              "villages": [
                { "code": "589196", "name": "Chilukuru" },
                { "code": "589197", "name": "Damuluru" },
                { "code": "589203", "name": "Elaprolu" },
                { "code": "589202", "name": "Gudurupadu" },
                { "code": "589207", "name": "Guntupalle (Ct)" },
                { "code": "589206", "name": "Ibrahimpatnam (Ct)" },
                { "code": "589200", "name": "Jupudi" },
                { "code": "589195", "name": "Kachavaram" },
                { "code": "589194", "name": "Kethanakonda" },
                { "code": "589205", "name": "Kondapalle (Ct)" },
                { "code": "589198", "name": "Kotikalapudi" },
                { "code": "589201", "name": "Malkapuram" },
                { "code": "589199", "name": "Mulapadu" },
                { "code": "589191", "name": "N.Pothavaram" },
                { "code": "589192", "name": "Trilochanapuram" },
                { "code": "589204", "name": "Tummalapalem" },
                { "code": "589193", "name": "Zami Machavaram" },
                { "code": "589190", "name": "Zami Navi Pothavaram" }
              ]
            },
            {
              "code": "4995",
              "name": "Mylavaram",
              "villages": [
                { "code": "588929", "name": "Chandragudem" },
                { "code": "588939", "name": "Chandrala" },
                { "code": "588927", "name": "Dasullapalem" },
                { "code": "588940", "name": "Ganapavaram" },
                { "code": "588926", "name": "Jangalapalle" },
                { "code": "588936", "name": "Kanimerla" },
                { "code": "588934", "name": "Keerthirayanigudem" },
                { "code": "588923", "name": "Morusumilli" },
                { "code": "588928", "name": "Mulakalapanta" },
                { "code": "588931", "name": "Mylavaram" },
                { "code": "588937", "name": "Parvathapuram" },
                { "code": "588930", "name": "Pondugula" },
                { "code": "588924", "name": "Pulluru" },
                { "code": "588932", "name": "Sabjapadu" },
                { "code": "588938", "name": "T.Gannavaram" },
                { "code": "588925", "name": "Tholukodu" },
                { "code": "588935", "name": "Vedurubeedem" },
                { "code": "588933", "name": "Velvadam" }
              ]
            }
          ]
        },
        {
          "code": "82",
          "name": "NANDIGAMA",
          "mandals": [
            {
              "code": "5008",
              "name": "Chandarlapadu",
              "villages": [
                { "code": "589174", "name": "Bobbellapadu" },
                { "code": "589169", "name": "Brahmabotlapalem" },
                { "code": "589177", "name": "Chandarlapadu" },
                { "code": "589180", "name": "Chintalapadu" },
                { "code": "589189", "name": "Eturu" },
                { "code": "589168", "name": "Gudimetla" },
                { "code": "589175", "name": "Gudimetlapalem" },
                { "code": "589183", "name": "Kasarabada" },
                { "code": "589167", "name": "Katrenipalle" },
                { "code": "589182", "name": "Kodavatikallu" },
                { "code": "589170", "name": "Konayapalem" },
                { "code": "589171", "name": "Medipalem" },
                { "code": "589172", "name": "Munagala Palle" },
                { "code": "589173", "name": "Muppalla" },
                { "code": "589181", "name": "Patempadu" },
                { "code": "589184", "name": "Pokkunuru" },
                { "code": "589187", "name": "Popuru" },
                { "code": "589185", "name": "Punnavalli" },
                { "code": "589179", "name": "Thotaravulapadu" },
                { "code": "589178", "name": "Thurlapadu" },
                { "code": "589176", "name": "Ustepalle" },
                { "code": "589186", "name": "Veladi" },
                { "code": "589188", "name": "Vibhareetapadu" }
              ]
            },
            {
              "code": "5007",
              "name": "Kanchikacherla",
              "villages": [
                { "code": "589164", "name": "Bathinapadu" },
                { "code": "589163", "name": "Chevitikallu" },
                { "code": "589152", "name": "Gandepalle" },
                { "code": "589165", "name": "Ganiatukuru" },
                { "code": "589154", "name": "Gottumukkala" },
                { "code": "589155", "name": "Kanchikacherla" },
                { "code": "589151", "name": "Keesara" },
                { "code": "589162", "name": "Kunikinapadu" },
                { "code": "589160", "name": "Moguluru" },
                { "code": "589161", "name": "Munnaluru" },
                { "code": "589166", "name": "Paritala" },
                { "code": "589157", "name": "Pendyala" },
                { "code": "589153", "name": "Perakalapadu" },
                { "code": "589156", "name": "Saidapuram" },
                { "code": "589159", "name": "Seri Amaravaram" },
                { "code": "589158", "name": "Vemulapalle" }
              ]
            },
            {
              "code": "4993",
              "name": "Nandigama",
              "villages": [
                { "code": "588876", "name": "Adiviravulapadu" },
                { "code": "588882", "name": "Ambarupeta" },
                { "code": "588878", "name": "Chandapuram" },
                { "code": "588892", "name": "Damuluru" },
                { "code": "588895", "name": "Gollamudi" },
                { "code": "588881", "name": "Ithavaram" },
                { "code": "588889", "name": "Jonnalagadda" },
                { "code": "588880", "name": "Kanchela" },
                { "code": "588879", "name": "Kethaveeruni Padu" },
                { "code": "588890", "name": "Konathamatmakuru" },
                { "code": "588887", "name": "Konduru" },
                { "code": "588877", "name": "Kurugantivari Khandrika" },
                { "code": "588874", "name": "Latchapalem" },
                { "code": "588875", "name": "Lingalapadu" },
                { "code": "588886", "name": "Magallu" },
                { "code": "588873", "name": "Munagacherla" },
                { "code": "588883", "name": "Nandigama" },
                { "code": "588885", "name": "Pallagiri" },
                { "code": "588871", "name": "Pedavaram" },
                { "code": "588896", "name": "Raghavapuram" },
                { "code": "588888", "name": "Ramireddipalle" },
                { "code": "588894", "name": "Rudravaram" },
                { "code": "588884", "name": "Satyavaram" },
                { "code": "588893", "name": "Somavaram" },
                { "code": "588872", "name": "Thakkellapadu" },
                { "code": "588891", "name": "Torragudipadu" }
              ]
            },
            {
              "code": "4994",
              "name": "Veerullapadu",
              "villages": [
                { "code": "588909", "name": "Alluru" },
                { "code": "588917", "name": "Bodavada" },
                { "code": "588908", "name": "Chattannavaram" },
                { "code": "588902", "name": "Chavatapalle" },
                { "code": "588911", "name": "Chennaraopalem" },
                { "code": "588907", "name": "Dachavaram" },
                { "code": "588898", "name": "Dodda Devarapadu" },
                { "code": "588918", "name": "Gokarajupalle" },
                { "code": "588900", "name": "Gudem Madhavaram" },
                { "code": "588921", "name": "Jagannadhapuram" },
                { "code": "588919", "name": "Jammavaram" },
                { "code": "588899", "name": "Jayanthi" },
                { "code": "588912", "name": "Jujjuru" },
                { "code": "588906", "name": "Konatalapalle" },
                { "code": "588913", "name": "Laxmipuram" },
                { "code": "588916", "name": "Nandaluru" },
                { "code": "588922", "name": "Narasimharaopalem" },
                { "code": "588905", "name": "Pallampalle" },
                { "code": "588901", "name": "Peddapuram" },
                { "code": "588920", "name": "Ponnavaram" },
                { "code": "588904", "name": "Ramapuram" },
                { "code": "588915", "name": "Tatigummi" },
                { "code": "588910", "name": "Thimmapuram" },
                { "code": "588897", "name": "Vairidhari Annavaram" },
                { "code": "588903", "name": "Veerullapadu" },
                { "code": "588914", "name": "Vellanki" }
              ]
            }
          ]
        },
        {
          "code": "83",
          "name": "TIRUVURU",
          "mandals": [
            {
              "code": "4998",
              "name": "Atlapragada Konduru",
              "villages": [
                { "code": "588988", "name": "A.Konduru" },
                { "code": "588987", "name": "Atlapragada" },
                { "code": "588991", "name": "Cheemalapadu" },
                { "code": "588984", "name": "Gollamandala" },
                { "code": "588985", "name": "Kambampadu" },
                { "code": "588986", "name": "Koduru" },
                { "code": "909981", "name": "Krishnaraopalem" },
                { "code": "588990", "name": "Kummarakuntla" },
                { "code": "588993", "name": "Madhavaram (East)" },
                { "code": "588992", "name": "Madhavaram (West)" },
                { "code": "588981", "name": "Marepalle" },
                { "code": "588982", "name": "Polisettipadu" },
                { "code": "588989", "name": "Repudi" },
                { "code": "588983", "name": "Vallampatla" }
              ]
            },
            {
              "code": "4996",
              "name": "Gampalagudem",
              "villages": [
                { "code": "588958", "name": "Anumollanka" },
                { "code": "588953", "name": "Arlapadu" },
                { "code": "588951", "name": "Chennavaram" },
                { "code": "588945", "name": "Dundiralapadu" },
                { "code": "588956", "name": "Gampalagudem" },
                { "code": "588949", "name": "Gosaveedu" },
                { "code": "588954", "name": "Gullapudi" },
                { "code": "588957", "name": "Kanumuru" },
                { "code": "588943", "name": "Konijerla" },
                { "code": "588959", "name": "Kothapalle" },
                { "code": "588955", "name": "Lingala" },
                { "code": "588952", "name": "Meduru" },
                { "code": "588961", "name": "Narikampadu" },
                { "code": "588942", "name": "Nemali" },
                { "code": "588950", "name": "Peda Komira" },
                { "code": "588948", "name": "Penugolanu" },
                { "code": "588947", "name": "Rajavaram" },
                { "code": "588946", "name": "Tunikipadu" },
                { "code": "588941", "name": "Ummadidevarapalle" },
                { "code": "588944", "name": "Utukuru" },
                { "code": "588960", "name": "Vinagadapa" }
              ]
            },
            {
              "code": "4997",
              "name": "Tiruvuru",
              "villages": [
                { "code": "588965", "name": "Akkapalem" },
                { "code": "588976", "name": "Anjaneyapuram" },
                { "code": "588972", "name": "Chintalapadu" },
                { "code": "588975", "name": "Chittela" },
                { "code": "588971", "name": "Erramadu" },
                { "code": "588974", "name": "Ganugapadu" },
                { "code": "909980", "name": "Kakarla" },
                { "code": "588967", "name": "Kokilampadu" },
                { "code": "588977", "name": "Laxmipuram" },
                { "code": "588979", "name": "Mallela" },
                { "code": "588964", "name": "Munukulla" },
                { "code": "588970", "name": "Mustikuntla" },
                { "code": "588980", "name": "Nadim Tiruvuru (Ct)" },
                { "code": "588968", "name": "Patha Tiruvuru" },
                { "code": "588962", "name": "Peddavaram" },
                { "code": "588966", "name": "Rajupeta" },
                { "code": "588978", "name": "Ramannapalem" },
                { "code": "588973", "name": "Rolupadi" },
                { "code": "588969", "name": "Vamakuntla" },
                { "code": "588963", "name": "Vavilala" }
              ]
            }
          ]
        },
        {
          "code": "84",
          "name": "VIJAYAWADA",
          "mandals": [
            {
              "code": "5010",
              "name": "Vijayawada Central",
              "villages": [
                { "code": "929837", "name": "Vijayawada Town" }
              ]
            },
            {
              "code": "6863",
              "name": "Vijayawada East",
              "villages": [
                { "code": "930365", "name": "Mogalrajapuram" },
                { "code": "930370", "name": "Patamata" }
              ]
            },
            {
              "code": "6864",
              "name": "Vijayawada North",
              "villages": [
                { "code": "930369", "name": "Gunadala" },
                { "code": "930363", "name": "Machavaram Palem" },
                { "code": "930362", "name": "Mutyalampadu" },
                { "code": "930372", "name": "Payakapuram" },
                { "code": "930360", "name": "Vijayawada Rural" }
              ]
            },
            {
              "code": "6865",
              "name": "Vijayawada West",
              "villages": [
                { "code": "930368", "name": "Bhavanipuram" },
                { "code": "930366", "name": "Vidhyadaharapuram" }
              ]
            },
            {
              "code": "5011",
              "name": "Vijayawada (Rural)",
              "villages": [
                { "code": "589219", "name": "Ambapuram (Og)" },
                { "code": "589225", "name": "Done Atkuru (Og)" },
                { "code": "589223", "name": "Enikepadu (Og)" },
                { "code": "589217", "name": "Gollapudi (Og)" },
                { "code": "589214", "name": "Gudavalli" },
                { "code": "589218", "name": "Jakkampudi (Og)" },
                { "code": "589208", "name": "Kotturu" },
                { "code": "929836", "name": "Kundha Vari Kandrika" },
                { "code": "589224", "name": "Nidamanuru (Og)" },
                { "code": "589222", "name": "Nunna (Og)" },
                { "code": "589212", "name": "Paidurupadu" },
                { "code": "589221", "name": "Pathapadu (Og)" },
                { "code": "589220", "name": "Phiryadi Nainavaram (Og)" },
                { "code": "589216", "name": "Prasadampadu (Ct)" },
                { "code": "589215", "name": "Ramavarappadu (Ct)" },
                { "code": "589213", "name": "Rayanapadu" },
                { "code": "589211", "name": "Shabada" },
                { "code": "589209", "name": "Tadepalle" },
                { "code": "589210", "name": "Vemavaram" }
              ]
            }
          ]
        },
        {
          "code": "85",
          "name": "VISSANNAPET",
          "mandals": [
            {
              "code": "4999",
              "name": "Reddigudem",
              "villages": [
                { "code": "588997", "name": "Anneraopeta" },
                { "code": "588999", "name": "Kudapa" },
                { "code": "588996", "name": "Kunaparajuparva" },
                { "code": "588995", "name": "Maddulaparva" },
                { "code": "588994", "name": "Mutchinapalle" },
                { "code": "589003", "name": "Naguluru" },
                { "code": "589001", "name": "Narukullapadu" },
                { "code": "589004", "name": "Patha Naguluru" },
                { "code": "589002", "name": "Rangapuram" },
                { "code": "588998", "name": "Reddigudem" },
                { "code": "589000", "name": "Rudravaram" }
              ]
            },
            {
              "code": "5000",
              "name": "Vissannapeta",
              "villages": [
                { "code": "589010", "name": "Chandrupatla" },
                { "code": "589007", "name": "Kalagara" },
                { "code": "589014", "name": "Kondaparva" },
                { "code": "589006", "name": "Korlamanda" },
                { "code": "589011", "name": "Narasapuram" },
                { "code": "589008", "name": "Putrela" },
                { "code": "589012", "name": "Tata Kuntla" },
                { "code": "589009", "name": "Tella Devarapalle" },
                { "code": "589005", "name": "Vemireddipalle" },
                { "code": "589013", "name": "Vissannapet" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Helper functions to get cascading dropdown data
export function getDistricts(): { code: string; name: string }[] {
  return INDIA_LOCATIONS.districts.map(d => ({ code: d.code, name: d.name }));
}

export function getMandalsForDistrict(districtName: string): { code: string; name: string }[] {
  const district = INDIA_LOCATIONS.districts.find(d => d.name === districtName);
  if (!district) return [];
  
  const mandals: { code: string; name: string }[] = [];
  district.subdivisions.forEach(sub => {
    sub.mandals.forEach(m => {
      mandals.push({ code: m.code, name: m.name });
    });
  });
  return mandals.sort((a, b) => a.name.localeCompare(b.name));
}

export function getVillagesForMandal(districtName: string, mandalName: string): { code: string; name: string }[] {
  const district = INDIA_LOCATIONS.districts.find(d => d.name === districtName);
  if (!district) return [];
  
  for (const sub of district.subdivisions) {
    const mandal = sub.mandals.find(m => m.name === mandalName);
    if (mandal) {
      return mandal.villages.map(v => ({ code: v.code, name: v.name })).sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  return [];
}

// Validation helpers
export function isValidMandal(districtName: string, mandalName: string): boolean {
  const mandals = getMandalsForDistrict(districtName);
  return mandals.some(m => m.name === mandalName);
}

export function isValidVillage(districtName: string, mandalName: string, villageName: string): boolean {
  const villages = getVillagesForMandal(districtName, mandalName);
  return villages.some(v => v.name === villageName);
}
