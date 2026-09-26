/**
 * "Narrow it to your industry": a paid chapter that reads a person's eight type scores against the roles
 * of one industry. AVOCO's API has no such thing; like lib/fit.ts, this is the platform's own reading.
 *
 * The catalogue below is language-free: role keys, the career level of each role, and the types whose
 * official AVOCO descriptions fit that role, with weights. Names and texts live in lib/i18n/industries-*.ts.
 * A role's score is the weighted average of the person's scores on those types (0 to 100, one decimal),
 * so the ranking follows the whole profile, not just the leading type. Emotional scales are left out on
 * purpose: they describe today, and a career choice is about the person in general.
 */

export const LEVELS = ["start", "grow", "lead"] as const;
export type Level = (typeof LEVELS)[number];
export type TypeKey = "organizer" | "driver" | "catalyst" | "performer" | "harmonizer" | "analyst" | "skeptic" | "mediator";
type W = Partial<Record<TypeKey, number>>;
export interface RoleRule { level: Level; types: W }

const role = (level: Level, types: W): RoleRule => ({ level, types });

export const INDUSTRIES = {
  construction: {
    owner: role("lead", { driver: 1, catalyst: 0.6, organizer: 0.5 }),
    projectManager: role("lead", { organizer: 1, driver: 0.7, skeptic: 0.3 }),
    siteManager: role("grow", { organizer: 1, driver: 0.6, harmonizer: 0.2 }),
    estimator: role("grow", { skeptic: 1, analyst: 0.6, organizer: 0.5 }),
    architect: role("grow", { analyst: 1, mediator: 0.4, performer: 0.3 }),
    foreman: role("start", { organizer: 0.8, driver: 0.6, harmonizer: 0.4 }),
    materialsSales: role("start", { catalyst: 1, performer: 0.5, driver: 0.3 }),
    safetyInspector: role("start", { skeptic: 1, organizer: 0.7 }),
  },
  education: {
    director: role("lead", { driver: 0.9, organizer: 0.9, harmonizer: 0.3 }),
    curriculumDesigner: role("grow", { analyst: 1, organizer: 0.5, mediator: 0.4 }),
    teacher: role("start", { harmonizer: 0.9, performer: 0.6, mediator: 0.5 }),
    lecturer: role("grow", { performer: 0.8, analyst: 0.6, catalyst: 0.4 }),
    tutor: role("start", { harmonizer: 0.8, mediator: 0.7, skeptic: 0.3 }),
    counsellor: role("grow", { mediator: 1, harmonizer: 0.8 }),
    edtechFounder: role("lead", { catalyst: 1, analyst: 0.6, driver: 0.6 }),
    admissions: role("start", { catalyst: 0.9, harmonizer: 0.6, organizer: 0.4 }),
  },
  healthcare: {
    clinicOwner: role("lead", { driver: 1, organizer: 0.6, catalyst: 0.4 }),
    headOfDepartment: role("lead", { organizer: 0.9, driver: 0.7, skeptic: 0.4 }),
    physician: role("grow", { skeptic: 0.9, analyst: 0.6, harmonizer: 0.5 }),
    nurse: role("start", { harmonizer: 1, skeptic: 0.5, organizer: 0.4 }),
    therapist: role("grow", { mediator: 1, harmonizer: 0.9 }),
    researcher: role("grow", { analyst: 1, skeptic: 0.6 }),
    patientCoordinator: role("start", { harmonizer: 0.8, organizer: 0.7, catalyst: 0.3 }),
    medicalSales: role("start", { catalyst: 1, performer: 0.4, skeptic: 0.3 }),
  },
  it: {
    cto: role("lead", { analyst: 0.9, driver: 0.8, organizer: 0.4 }),
    engineeringManager: role("lead", { organizer: 0.9, harmonizer: 0.5, driver: 0.5 }),
    softwareEngineer: role("start", { analyst: 1, skeptic: 0.5 }),
    productManager: role("grow", { catalyst: 0.8, analyst: 0.6, driver: 0.5 }),
    qaEngineer: role("start", { skeptic: 1, analyst: 0.5, organizer: 0.3 }),
    dataScientist: role("grow", { analyst: 1, skeptic: 0.6 }),
    uxDesigner: role("grow", { analyst: 0.7, harmonizer: 0.6, performer: 0.4 }),
    devRel: role("grow", { performer: 0.9, catalyst: 0.8, analyst: 0.4 }),
    techSales: role("start", { catalyst: 1, driver: 0.4, analyst: 0.3 }),
  },
  sales: {
    salesDirector: role("lead", { driver: 1, catalyst: 0.7, organizer: 0.4 }),
    keyAccountManager: role("grow", { catalyst: 0.8, harmonizer: 0.6, organizer: 0.4 }),
    fieldSales: role("start", { catalyst: 1, performer: 0.5, driver: 0.4 }),
    insideSales: role("start", { catalyst: 0.8, organizer: 0.5, harmonizer: 0.4 }),
    presales: role("grow", { analyst: 0.9, catalyst: 0.5, performer: 0.4 }),
    salesOps: role("grow", { organizer: 1, skeptic: 0.6, analyst: 0.4 }),
    customerSuccess: role("start", { harmonizer: 1, organizer: 0.4, catalyst: 0.3 }),
    trainer: role("grow", { performer: 1, catalyst: 0.6, harmonizer: 0.4 }),
  },
  finance: {
    cfo: role("lead", { skeptic: 0.8, driver: 0.8, organizer: 0.8 }),
    financialAnalyst: role("start", { analyst: 0.9, skeptic: 0.8 }),
    accountant: role("start", { skeptic: 1, organizer: 0.8 }),
    auditor: role("grow", { skeptic: 1, organizer: 0.6, analyst: 0.4 }),
    investmentAdvisor: role("grow", { catalyst: 0.8, driver: 0.6, skeptic: 0.5 }),
    riskManager: role("grow", { skeptic: 1, analyst: 0.7 }),
    trader: role("grow", { driver: 0.8, catalyst: 0.7, analyst: 0.5 }),
    fintechFounder: role("lead", { catalyst: 0.9, driver: 0.8, analyst: 0.6 }),
  },
  hospitality: {
    hotelGm: role("lead", { organizer: 0.9, driver: 0.7, harmonizer: 0.5 }),
    restaurantOwner: role("lead", { driver: 0.9, catalyst: 0.7, performer: 0.4 }),
    chef: role("grow", { analyst: 0.7, driver: 0.6, skeptic: 0.6 }),
    frontOffice: role("start", { harmonizer: 1, performer: 0.5, organizer: 0.4 }),
    eventManager: role("grow", { catalyst: 0.9, organizer: 0.8, performer: 0.6 }),
    concierge: role("start", { harmonizer: 0.9, catalyst: 0.6 }),
    revenueManager: role("grow", { skeptic: 0.9, analyst: 0.7, organizer: 0.5 }),
    tourGuide: role("start", { performer: 1, catalyst: 0.6, harmonizer: 0.4 }),
  },
  logistics: {
    supplyChainDirector: role("lead", { organizer: 1, driver: 0.7, analyst: 0.4 }),
    warehouseManager: role("grow", { organizer: 1, driver: 0.5, harmonizer: 0.3 }),
    dispatcher: role("start", { organizer: 0.9, skeptic: 0.5, catalyst: 0.3 }),
    procurement: role("grow", { skeptic: 0.8, catalyst: 0.6, organizer: 0.6 }),
    customsBroker: role("grow", { skeptic: 1, organizer: 0.7 }),
    freightSales: role("start", { catalyst: 1, driver: 0.4 }),
    logisticsAnalyst: role("start", { analyst: 1, skeptic: 0.6 }),
    fleetOwner: role("lead", { driver: 1, organizer: 0.6, catalyst: 0.4 }),
  },
  realestate: {
    developer: role("lead", { driver: 1, catalyst: 0.6, skeptic: 0.4 }),
    agent: role("start", { catalyst: 1, performer: 0.6, harmonizer: 0.4 }),
    brokerageOwner: role("lead", { driver: 0.9, catalyst: 0.8, organizer: 0.5 }),
    propertyManager: role("grow", { organizer: 1, harmonizer: 0.5, skeptic: 0.4 }),
    appraiser: role("grow", { skeptic: 1, analyst: 0.6 }),
    mortgageAdvisor: role("start", { skeptic: 0.7, catalyst: 0.6, harmonizer: 0.5 }),
    interiorStager: role("start", { performer: 0.8, analyst: 0.5, harmonizer: 0.5 }),
    investor: role("lead", { driver: 0.8, skeptic: 0.7, analyst: 0.5 }),
  },
  manufacturing: {
    plantDirector: role("lead", { driver: 0.9, organizer: 0.9 }),
    productionManager: role("grow", { organizer: 1, driver: 0.5, skeptic: 0.4 }),
    processEngineer: role("grow", { analyst: 1, skeptic: 0.6, organizer: 0.4 }),
    qualityManager: role("grow", { skeptic: 1, organizer: 0.6 }),
    shiftSupervisor: role("start", { organizer: 0.8, driver: 0.5, harmonizer: 0.5 }),
    technician: role("start", { analyst: 0.7, skeptic: 0.7 }),
    industrialSales: role("start", { catalyst: 1, analyst: 0.4 }),
    productDesigner: role("grow", { analyst: 1, performer: 0.4, mediator: 0.3 }),
  },
  media: {
    editorInChief: role("lead", { driver: 0.9, organizer: 0.6, analyst: 0.5 }),
    producer: role("lead", { catalyst: 0.9, organizer: 0.8, driver: 0.6 }),
    presenter: role("grow", { performer: 1, catalyst: 0.6 }),
    journalist: role("start", { analyst: 0.7, catalyst: 0.7, skeptic: 0.5 }),
    contentCreator: role("start", { performer: 1, catalyst: 0.7 }),
    editor: role("grow", { skeptic: 0.9, analyst: 0.6, mediator: 0.4 }),
    pr: role("grow", { catalyst: 1, performer: 0.6, harmonizer: 0.4 }),
    documentaryMaker: role("grow", { mediator: 0.9, analyst: 0.7, performer: 0.3 }),
  },
  law: {
    partner: role("lead", { driver: 1, skeptic: 0.6, catalyst: 0.5 }),
    litigator: role("grow", { driver: 0.9, performer: 0.6, skeptic: 0.5 }),
    corporateLawyer: role("grow", { skeptic: 0.9, organizer: 0.7, analyst: 0.4 }),
    mediator: role("grow", { mediator: 1, harmonizer: 0.8 }),
    paralegal: role("start", { organizer: 0.9, skeptic: 0.8 }),
    compliance: role("grow", { skeptic: 1, organizer: 0.8 }),
    legalResearcher: role("start", { analyst: 1, skeptic: 0.6 }),
    notary: role("start", { skeptic: 1, organizer: 0.7, harmonizer: 0.3 }),
  },
  beauty: {
    salonOwner: role("lead", { driver: 0.9, catalyst: 0.7, harmonizer: 0.4 }),
    stylist: role("start", { performer: 0.8, harmonizer: 0.7, analyst: 0.4 }),
    makeupArtist: role("start", { performer: 1, analyst: 0.5, harmonizer: 0.4 }),
    cosmetologist: role("start", { harmonizer: 0.9, skeptic: 0.7 }),
    brandAmbassador: role("grow", { performer: 1, catalyst: 0.8 }),
    productDeveloper: role("grow", { analyst: 0.9, skeptic: 0.6 }),
    salonManager: role("grow", { organizer: 1, harmonizer: 0.5, catalyst: 0.3 }),
    beautyEducator: role("grow", { performer: 0.8, harmonizer: 0.6, organizer: 0.4 }),
  },
  retail: {
    retailDirector: role("lead", { driver: 0.9, organizer: 0.9 }),
    storeManager: role("grow", { organizer: 1, harmonizer: 0.5, driver: 0.4 }),
    buyer: role("grow", { skeptic: 0.8, catalyst: 0.6, analyst: 0.5 }),
    visualMerchandiser: role("start", { performer: 0.9, analyst: 0.6 }),
    salesAssociate: role("start", { harmonizer: 0.8, catalyst: 0.7, performer: 0.4 }),
    ecommerceManager: role("grow", { analyst: 0.8, catalyst: 0.6, organizer: 0.5 }),
    franchiseOwner: role("lead", { driver: 1, catalyst: 0.6, organizer: 0.5 }),
    customerCare: role("start", { harmonizer: 1, organizer: 0.4 }),
  },
  public: {
    electedOfficial: role("lead", { driver: 1, performer: 0.7, catalyst: 0.6 }),
    departmentHead: role("lead", { organizer: 1, driver: 0.6, skeptic: 0.4 }),
    policyAnalyst: role("grow", { analyst: 1, skeptic: 0.6 }),
    caseworker: role("start", { harmonizer: 1, mediator: 0.6, organizer: 0.4 }),
    inspector: role("start", { skeptic: 1, organizer: 0.7 }),
    communityLiaison: role("grow", { catalyst: 0.9, harmonizer: 0.7, performer: 0.4 }),
    diplomat: role("grow", { mediator: 0.8, driver: 0.5, performer: 0.5 }),
    clerk: role("start", { organizer: 1, skeptic: 0.6 }),
  },
  nonprofit: {
    executiveDirector: role("lead", { driver: 0.9, mediator: 0.6, organizer: 0.6 }),
    fundraiser: role("grow", { catalyst: 1, performer: 0.6, driver: 0.4 }),
    programManager: role("grow", { organizer: 1, harmonizer: 0.6 }),
    socialWorker: role("start", { mediator: 1, harmonizer: 0.9 }),
    volunteerCoordinator: role("start", { harmonizer: 0.9, catalyst: 0.7, organizer: 0.5 }),
    advocate: role("grow", { driver: 0.7, mediator: 0.7, performer: 0.6 }),
    grantWriter: role("start", { analyst: 0.8, skeptic: 0.7, mediator: 0.4 }),
    founder: role("lead", { mediator: 0.8, driver: 0.8, catalyst: 0.6 }),
  },
  sports: {
    clubOwner: role("lead", { driver: 1, catalyst: 0.6 }),
    headCoach: role("lead", { driver: 0.9, organizer: 0.6, harmonizer: 0.5 }),
    athlete: role("start", { driver: 0.8, performer: 0.6, skeptic: 0.4 }),
    personalTrainer: role("start", { harmonizer: 0.8, performer: 0.7, driver: 0.4 }),
    sportsAgent: role("grow", { catalyst: 1, driver: 0.7 }),
    physiotherapist: role("grow", { harmonizer: 0.8, skeptic: 0.7, analyst: 0.4 }),
    performanceAnalyst: role("grow", { analyst: 1, skeptic: 0.6 }),
    eventOrganizer: role("grow", { organizer: 1, catalyst: 0.7, performer: 0.4 }),
  },
  arts: {
    artist: role("start", { mediator: 0.9, analyst: 0.7, performer: 0.5 }),
    performerRole: role("start", { performer: 1, catalyst: 0.4 }),
    creativeDirector: role("lead", { performer: 0.8, analyst: 0.7, driver: 0.6 }),
    galleryOwner: role("lead", { catalyst: 0.8, driver: 0.7, mediator: 0.5 }),
    curator: role("grow", { analyst: 0.8, mediator: 0.7, skeptic: 0.5 }),
    artTeacher: role("grow", { harmonizer: 0.9, mediator: 0.6, performer: 0.5 }),
    agent: role("grow", { catalyst: 1, driver: 0.5 }),
    productionManager: role("grow", { organizer: 1, catalyst: 0.5 }),
  },
  science: {
    labDirector: role("lead", { driver: 0.8, organizer: 0.7, analyst: 0.7 }),
    researchScientist: role("grow", { analyst: 1, skeptic: 0.6 }),
    labTechnician: role("start", { skeptic: 1, organizer: 0.6 }),
    scienceCommunicator: role("grow", { performer: 0.9, catalyst: 0.6, analyst: 0.5 }),
    grantManager: role("grow", { organizer: 0.9, skeptic: 0.6, catalyst: 0.4 }),
    phdStudent: role("start", { analyst: 1, mediator: 0.4, skeptic: 0.4 }),
    industryLiaison: role("grow", { catalyst: 0.9, analyst: 0.6, driver: 0.5 }),
    startupFounder: role("lead", { catalyst: 0.8, driver: 0.8, analyst: 0.8 }),
  },
  agriculture: {
    farmOwner: role("lead", { driver: 0.9, organizer: 0.8, skeptic: 0.4 }),
    farmManager: role("grow", { organizer: 1, driver: 0.5, harmonizer: 0.3 }),
    agronomist: role("grow", { analyst: 0.9, skeptic: 0.7 }),
    equipmentOperator: role("start", { organizer: 0.6, skeptic: 0.6, analyst: 0.4 }),
    produceTrader: role("grow", { catalyst: 1, driver: 0.6, skeptic: 0.4 }),
    veterinarian: role("grow", { harmonizer: 0.8, skeptic: 0.8, analyst: 0.4 }),
    agritechFounder: role("lead", { catalyst: 0.8, analyst: 0.8, driver: 0.7 }),
    cooperativeLead: role("grow", { harmonizer: 0.8, mediator: 0.6, organizer: 0.6 }),
  },
  transport: {
    airlineExecutive: role("lead", { driver: 0.9, organizer: 0.9 }),
    pilot: role("grow", { skeptic: 0.9, organizer: 0.8, driver: 0.4 }),
    flightAttendant: role("start", { harmonizer: 0.9, performer: 0.6, organizer: 0.5 }),
    trafficController: role("grow", { skeptic: 1, organizer: 0.9 }),
    driverRole: role("start", { organizer: 0.7, skeptic: 0.6, mediator: 0.3 }),
    routePlanner: role("grow", { analyst: 0.9, organizer: 0.7 }),
    stationManager: role("grow", { organizer: 1, driver: 0.5, harmonizer: 0.4 }),
    mobilityFounder: role("lead", { catalyst: 0.9, driver: 0.8, analyst: 0.6 }),
  },
  security: {
    securityDirector: role("lead", { driver: 0.9, organizer: 0.9, skeptic: 0.5 }),
    securityOfficer: role("start", { organizer: 0.8, skeptic: 0.7, driver: 0.4 }),
    investigator: role("grow", { analyst: 0.9, skeptic: 0.8 }),
    cybersecurityAnalyst: role("grow", { analyst: 1, skeptic: 0.8 }),
    riskConsultant: role("grow", { skeptic: 0.8, driver: 0.6, catalyst: 0.5 }),
    bodyguard: role("start", { driver: 0.7, organizer: 0.7, skeptic: 0.5 }),
    trainingInstructor: role("grow", { performer: 0.7, driver: 0.7, organizer: 0.5 }),
    agencyOwner: role("lead", { driver: 1, catalyst: 0.6 }),
  },
  consulting: {
    managingPartner: role("lead", { driver: 1, catalyst: 0.6, organizer: 0.5 }),
    strategyConsultant: role("grow", { analyst: 0.9, driver: 0.7, catalyst: 0.4 }),
    businessAnalyst: role("start", { analyst: 1, skeptic: 0.6, organizer: 0.4 }),
    changeManager: role("grow", { harmonizer: 0.8, organizer: 0.7, catalyst: 0.5 }),
    trainerFacilitator: role("grow", { performer: 1, harmonizer: 0.6, catalyst: 0.5 }),
    executiveCoach: role("grow", { mediator: 0.9, harmonizer: 0.7, driver: 0.4 }),
    businessDeveloper: role("start", { catalyst: 1, driver: 0.6 }),
    independentExpert: role("lead", { analyst: 0.8, skeptic: 0.6, catalyst: 0.5 }),
  },
  entrepreneurship: {
    founderCeo: role("lead", { driver: 1, catalyst: 0.8 }),
    cofounderProduct: role("lead", { analyst: 0.9, driver: 0.5, catalyst: 0.5 }),
    cofounderOps: role("lead", { organizer: 1, skeptic: 0.6, driver: 0.4 }),
    growthLead: role("grow", { catalyst: 1, performer: 0.6, analyst: 0.4 }),
    earlyEmployee: role("start", { catalyst: 0.7, analyst: 0.6, organizer: 0.5 }),
    investorRelations: role("grow", { performer: 0.8, catalyst: 0.7, skeptic: 0.4 }),
    communityBuilder: role("start", { harmonizer: 0.9, catalyst: 0.8, performer: 0.4 }),
    solopreneur: role("lead", { analyst: 0.7, catalyst: 0.7, mediator: 0.5 }),
  },
  automotive: {
    dealershipOwner: role("lead", { driver: 1, catalyst: 0.7, organizer: 0.4 }),
    serviceManager: role("grow", { organizer: 1, harmonizer: 0.5, skeptic: 0.4 }),
    carSales: role("start", { catalyst: 1, performer: 0.6 }),
    mechanic: role("start", { analyst: 0.7, skeptic: 0.7, organizer: 0.3 }),
    automotiveEngineer: role("grow", { analyst: 1, skeptic: 0.5 }),
    fleetManager: role("grow", { organizer: 1, skeptic: 0.5 }),
    partsBuyer: role("grow", { skeptic: 0.8, catalyst: 0.5, organizer: 0.5 }),
    evStartupFounder: role("lead", { catalyst: 0.8, driver: 0.8, analyst: 0.7 }),
  },
  energy: {
    plantManager: role("lead", { organizer: 1, driver: 0.7, skeptic: 0.5 }),
    fieldEngineer: role("grow", { analyst: 0.9, skeptic: 0.6, organizer: 0.4 }),
    hseOfficer: role("start", { skeptic: 1, organizer: 0.8 }),
    energyTrader: role("grow", { driver: 0.8, catalyst: 0.6, analyst: 0.6 }),
    projectDeveloper: role("lead", { driver: 0.9, catalyst: 0.7, organizer: 0.5 }),
    technician: role("start", { skeptic: 0.7, analyst: 0.6, organizer: 0.5 }),
    sustainabilityLead: role("grow", { mediator: 0.8, analyst: 0.6, performer: 0.4 }),
    utilityCustomerService: role("start", { harmonizer: 1, organizer: 0.4 }),
  },
  insurance: {
    agencyOwner: role("lead", { driver: 0.9, catalyst: 0.8 }),
    insuranceAgent: role("start", { catalyst: 1, harmonizer: 0.5 }),
    underwriter: role("grow", { skeptic: 1, analyst: 0.6 }),
    claimsAdjuster: role("start", { skeptic: 0.9, harmonizer: 0.5, organizer: 0.5 }),
    actuary: role("grow", { analyst: 1, skeptic: 0.8 }),
    riskEngineer: role("grow", { skeptic: 0.9, analyst: 0.7 }),
    claimsManager: role("lead", { organizer: 1, driver: 0.5, harmonizer: 0.4 }),
    insurtechFounder: role("lead", { catalyst: 0.8, driver: 0.8, analyst: 0.6 }),
  },
  banking: {
    branchManager: role("lead", { organizer: 0.9, driver: 0.7, harmonizer: 0.4 }),
    relationshipManager: role("grow", { catalyst: 0.9, harmonizer: 0.6, skeptic: 0.3 }),
    creditAnalyst: role("start", { skeptic: 1, analyst: 0.6 }),
    teller: role("start", { harmonizer: 0.8, organizer: 0.7, skeptic: 0.4 }),
    investmentBanker: role("grow", { driver: 1, catalyst: 0.6, analyst: 0.5 }),
    complianceOfficer: role("grow", { skeptic: 1, organizer: 0.8 }),
    privateBanker: role("grow", { catalyst: 0.8, driver: 0.5, harmonizer: 0.5 }),
    bankExecutive: role("lead", { driver: 1, organizer: 0.7, skeptic: 0.5 }),
  },
  fashion: {
    designer: role("grow", { analyst: 0.8, performer: 0.7, mediator: 0.5 }),
    brandOwner: role("lead", { driver: 0.9, catalyst: 0.8, performer: 0.5 }),
    buyer: role("grow", { skeptic: 0.7, catalyst: 0.6, analyst: 0.5 }),
    stylist: role("start", { performer: 1, harmonizer: 0.5 }),
    model: role("start", { performer: 1, driver: 0.3 }),
    productionManager: role("grow", { organizer: 1, skeptic: 0.6 }),
    fashionMarketer: role("grow", { performer: 0.8, catalyst: 0.8 }),
    patternMaker: role("start", { skeptic: 0.9, analyst: 0.7 }),
  },
  gaming: {
    studioHead: role("lead", { driver: 0.9, analyst: 0.6, catalyst: 0.5 }),
    gameDesigner: role("grow", { analyst: 1, performer: 0.4, mediator: 0.3 }),
    gameDeveloper: role("start", { analyst: 1, skeptic: 0.5 }),
    artist: role("start", { analyst: 0.7, mediator: 0.7, performer: 0.4 }),
    producer: role("grow", { organizer: 1, catalyst: 0.5, driver: 0.4 }),
    communityManager: role("start", { catalyst: 0.9, harmonizer: 0.8, performer: 0.4 }),
    streamer: role("start", { performer: 1, catalyst: 0.7 }),
    qaTester: role("start", { skeptic: 1, analyst: 0.4 }),
    esportsManager: role("grow", { driver: 0.8, catalyst: 0.7, organizer: 0.5 }),
  },
  marketing: {
    cmo: role("lead", { driver: 0.8, catalyst: 0.8, analyst: 0.5 }),
    brandManager: role("grow", { organizer: 0.7, performer: 0.6, catalyst: 0.6 }),
    copywriter: role("start", { analyst: 0.6, performer: 0.6, mediator: 0.6 }),
    performanceMarketer: role("grow", { analyst: 0.9, skeptic: 0.6, catalyst: 0.4 }),
    socialMediaManager: role("start", { performer: 0.9, catalyst: 0.8 }),
    accountManager: role("grow", { catalyst: 0.8, harmonizer: 0.7, organizer: 0.5 }),
    creativeDirector: role("lead", { performer: 0.8, analyst: 0.7, driver: 0.6 }),
    marketResearcher: role("start", { analyst: 1, skeptic: 0.7 }),
    agencyOwner: role("lead", { driver: 1, catalyst: 0.8 }),
  },
  hr: {
    hrDirector: role("lead", { organizer: 0.9, driver: 0.6, harmonizer: 0.6 }),
    recruiter: role("start", { catalyst: 1, harmonizer: 0.6, performer: 0.3 }),
    hrBusinessPartner: role("grow", { harmonizer: 0.8, organizer: 0.6, driver: 0.4 }),
    trainingManager: role("grow", { performer: 0.9, harmonizer: 0.6, organizer: 0.4 }),
    compensationAnalyst: role("start", { skeptic: 1, analyst: 0.7 }),
    headhunter: role("grow", { catalyst: 1, driver: 0.6 }),
    coach: role("grow", { mediator: 0.9, harmonizer: 0.8 }),
    hrOps: role("start", { organizer: 1, skeptic: 0.6 }),
  },
  architecture: {
    architect: role("grow", { analyst: 1, mediator: 0.4, organizer: 0.3 }),
    studioOwner: role("lead", { driver: 0.8, analyst: 0.7, catalyst: 0.6 }),
    interiorDesigner: role("start", { performer: 0.7, analyst: 0.6, harmonizer: 0.5 }),
    urbanPlanner: role("grow", { analyst: 0.8, mediator: 0.6, organizer: 0.5 }),
    landscapeArchitect: role("grow", { mediator: 0.8, analyst: 0.7 }),
    projectArchitect: role("grow", { organizer: 0.9, analyst: 0.6, skeptic: 0.4 }),
    draftsman: role("start", { skeptic: 0.8, analyst: 0.7 }),
    designSales: role("start", { catalyst: 0.9, performer: 0.6 }),
  },
  telecom: {
    networkEngineer: role("grow", { analyst: 1, skeptic: 0.6 }),
    fieldTechnician: role("start", { organizer: 0.7, skeptic: 0.6, analyst: 0.5 }),
    telecomSales: role("start", { catalyst: 1, driver: 0.4 }),
    operationsDirector: role("lead", { organizer: 1, driver: 0.7 }),
    productManager: role("grow", { catalyst: 0.7, analyst: 0.7, driver: 0.4 }),
    customerRetention: role("start", { harmonizer: 0.9, catalyst: 0.5 }),
    regulatoryAffairs: role("grow", { skeptic: 0.9, organizer: 0.7 }),
    telecomExecutive: role("lead", { driver: 1, organizer: 0.6 }),
  },
  pharma: {
    medicalScienceLiaison: role("grow", { analyst: 0.8, catalyst: 0.6, harmonizer: 0.4 }),
    clinicalTrialManager: role("grow", { organizer: 1, skeptic: 0.7 }),
    researchScientist: role("grow", { analyst: 1, skeptic: 0.6 }),
    regulatoryAffairs: role("grow", { skeptic: 1, organizer: 0.8 }),
    pharmaSalesRep: role("start", { catalyst: 1, performer: 0.4, skeptic: 0.3 }),
    qualityControl: role("start", { skeptic: 1, organizer: 0.6 }),
    productionSupervisor: role("start", { organizer: 0.9, driver: 0.4, skeptic: 0.5 }),
    biotechFounder: role("lead", { analyst: 0.9, driver: 0.8, catalyst: 0.6 }),
    countryManager: role("lead", { driver: 1, organizer: 0.6, catalyst: 0.5 }),
  },
  trades: {
    contractorOwner: role("lead", { driver: 1, catalyst: 0.6, organizer: 0.5 }),
    electrician: role("start", { skeptic: 0.8, analyst: 0.7, organizer: 0.4 }),
    plumber: role("start", { organizer: 0.7, skeptic: 0.7, analyst: 0.4 }),
    carpenter: role("start", { analyst: 0.7, mediator: 0.5, skeptic: 0.5 }),
    hvacTechnician: role("start", { analyst: 0.7, skeptic: 0.7 }),
    crewLead: role("grow", { organizer: 0.9, driver: 0.6, harmonizer: 0.4 }),
    tradesInstructor: role("grow", { performer: 0.7, harmonizer: 0.6, organizer: 0.5 }),
    serviceDispatcher: role("start", { organizer: 0.9, harmonizer: 0.5, catalyst: 0.4 }),
  },
  emergency: {
    firefighter: role("start", { driver: 0.8, organizer: 0.7, harmonizer: 0.4 }),
    paramedic: role("start", { skeptic: 0.7, harmonizer: 0.7, driver: 0.5 }),
    policeOfficer: role("start", { organizer: 0.9, driver: 0.7, skeptic: 0.4 }),
    detective: role("grow", { analyst: 0.9, skeptic: 0.8 }),
    dispatcher: role("start", { organizer: 1, skeptic: 0.6 }),
    stationChief: role("lead", { driver: 1, organizer: 0.8 }),
    emergencyPlanner: role("grow", { organizer: 0.9, analyst: 0.7, skeptic: 0.5 }),
    crisisCounsellor: role("grow", { mediator: 1, harmonizer: 0.9 }),
  },
} as const satisfies Record<string, Record<string, RoleRule>>;

/**
 * What today's voice says about readiness for each career level. Emotional scales describe the day, not the
 * person, so they never move the ranking; they only add a note.
 */
export const LEVEL_SCALES: Record<Level, Record<string, number>> = {
  start: { energy_level: 1, openness_to_new: 1, ability_to_attract: 0.7 },
  grow: { self_control: 1, ability_to_assert: 0.8, stress_tolerance: 0.8 },
  lead: { authority: 1, ability_to_set_goals: 1, stress_tolerance: 0.7 },
};

export type IndustryKey = keyof typeof INDUSTRIES;
export const INDUSTRY_KEYS = Object.keys(INDUSTRIES) as IndustryKey[];
export const isIndustry = (v: unknown): v is IndustryKey => typeof v === "string" && Object.hasOwn(INDUSTRIES, v);

export interface RoleFit {
  key: string;
  level: Level;
  /** 0 to 100, one decimal. */
  score: number;
  /** The types behind the score, strongest contribution first. */
  because: Array<{ type: TypeKey; value: number }>;
}
export interface IndustryFit {
  industry: IndustryKey;
  /** Every role, best first. */
  roles: RoleFit[];
  /** The best role at each level: where to start, what to grow into, what to aim for. */
  path: Record<Level, RoleFit>;
  /** Average of the top three roles: how much of the industry plays to the person. */
  overall: number;
  /** The person's two strongest types and the roles in this industry where both count. */
  pair: { types: [TypeKey, TypeKey]; roles: string[] };
  /** Today's readiness per level from the emotional scales, or null without them. */
  today: Record<Level, { score: number; scales: Array<{ key: string; value: number }> }> | null;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Ranks an industry's roles for one profile. Returns null unless all eight types were scored. */
export function industryFit(industry: IndustryKey, types: Array<{ key: string; value: number }>, scales: Array<{ key: string; value: number }> | null = null): IndustryFit | null {
  const scores = new Map(types.map((t) => [t.key, t.value]));
  const roles: RoleFit[] = [];
  for (const [key, rule] of Object.entries(INDUSTRIES[industry]) as Array<[string, RoleRule]>) {
    const parts = Object.entries(rule.types).map(([type, weight]) => ({ type: type as TypeKey, weight, value: scores.get(type) }));
    if (parts.some((p) => p.value === undefined)) return null;
    const known = parts as Array<{ type: TypeKey; weight: number; value: number }>;
    const total = known.reduce((s, p) => s + p.weight, 0);
    roles.push({
      key,
      level: rule.level,
      score: round(known.reduce((s, p) => s + p.weight * p.value, 0) / total),
      because: [...known].sort((a, b) => b.weight * b.value - a.weight * a.value).map(({ type, value }) => ({ type, value })),
    });
  }
  roles.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const path = Object.fromEntries(LEVELS.map((level) => [level, roles.find((r) => r.level === level)!])) as Record<Level, RoleFit>;
  const overall = round(roles.slice(0, 3).reduce((s, r) => s + r.score, 0) / Math.min(3, roles.length));

  const [first, second] = [...types].sort((a, b) => b.value - a.value).map((t) => t.key as TypeKey);
  const pairRoles = roles.filter((r) => { const w = INDUSTRIES[industry][r.key as keyof (typeof INDUSTRIES)[typeof industry]] as RoleRule; return first in w.types && second in w.types; }).map((r) => r.key);

  const scaleScores = new Map((scales ?? []).map((s) => [s.key, s.value]));
  let today: IndustryFit["today"] = null;
  if (scaleScores.size > 0) {
    today = {} as NonNullable<IndustryFit["today"]>;
    for (const level of LEVELS) {
      const parts = Object.entries(LEVEL_SCALES[level]).filter(([key]) => scaleScores.has(key)).map(([key, weight]) => ({ key, weight, value: scaleScores.get(key)! }));
      const total = parts.reduce((s, p) => s + p.weight, 0);
      today[level] = { score: total ? round(parts.reduce((s, p) => s + p.weight * p.value, 0) / total) : 0, scales: parts.map(({ key, value }) => ({ key, value })) };
    }
  }
  return { industry, roles, path, overall, pair: { types: [first, second], roles: pairRoles }, today };
}

/** Every industry's overall fit for a profile, best first: where a chosen industry stands among all of them. */
export function industryRanking(types: Array<{ key: string; value: number }>): Array<{ industry: IndustryKey; overall: number }> {
  return INDUSTRY_KEYS.map((industry) => ({ industry, overall: industryFit(industry, types)?.overall ?? 0 })).sort((a, b) => b.overall - a.overall || a.industry.localeCompare(b.industry));
}
