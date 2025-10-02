// Script to seed initial medical codes for controlled vocabulary
const mongoose = require('mongoose');
const { MedicalCode } = require('./models/db');
require('dotenv').config();

const medicalCodes = [
    // Common Conditions (ICD-10 style)
    { code: 'E11.9', codeSystem: 'ICD-10', displayName: 'Type 2 diabetes mellitus without complications', category: 'condition', synonyms: ['diabetes', 'diabetes mellitus', 'type 2 diabetes'] },
    { code: 'I10', codeSystem: 'ICD-10', displayName: 'Essential (primary) hypertension', category: 'condition', synonyms: ['high blood pressure', 'hypertension'] },
    { code: 'J45.909', codeSystem: 'ICD-10', displayName: 'Unspecified asthma, uncomplicated', category: 'condition', synonyms: ['asthma'] },
    { code: 'M54.5', codeSystem: 'ICD-10', displayName: 'Low back pain', category: 'condition', synonyms: ['back pain', 'lower back pain'] },
    { code: 'J00', codeSystem: 'ICD-10', displayName: 'Acute nasopharyngitis (common cold)', category: 'condition', synonyms: ['common cold', 'cold'] },
    { code: 'G43.909', codeSystem: 'ICD-10', displayName: 'Migraine, unspecified, not intractable, without status migrainosus', category: 'condition', synonyms: ['migraine', 'headache'] },

    // Common Medications (RXNORM style)
    { code: '197361', codeSystem: 'RXNORM', displayName: 'Aspirin 325 MG Oral Tablet', category: 'medication', synonyms: ['aspirin', 'acetylsalicylic acid'] },
    { code: '197378', codeSystem: 'RXNORM', displayName: 'Ibuprofen 200 MG Oral Tablet', category: 'medication', synonyms: ['ibuprofen', 'advil', 'motrin'] },
    { code: '197696', codeSystem: 'RXNORM', displayName: 'Acetaminophen 325 MG Oral Tablet', category: 'medication', synonyms: ['acetaminophen', 'paracetamol', 'tylenol'] },
    { code: '197517', codeSystem: 'RXNORM', displayName: 'Amoxicillin 500 MG Oral Capsule', category: 'medication', synonyms: ['amoxicillin', 'amoxil'] },
    { code: '197320', codeSystem: 'RXNORM', displayName: 'Lisinopril 10 MG Oral Tablet', category: 'medication', synonyms: ['lisinopril', 'prinivil', 'zestril'] },
    { code: '197521', codeSystem: 'RXNORM', displayName: 'Metformin 500 MG Oral Tablet', category: 'medication', synonyms: ['metformin', 'glucophage'] },

    // Common Allergens
    { code: 'ALG001', codeSystem: 'INTERNAL', displayName: 'Penicillin', category: 'allergen', synonyms: ['penicillin', 'penicillin antibiotics'] },
    { code: 'ALG002', codeSystem: 'INTERNAL', displayName: 'Shellfish', category: 'allergen', synonyms: ['shellfish', 'seafood'] },
    { code: 'ALG003', codeSystem: 'INTERNAL', displayName: 'Peanuts', category: 'allergen', synonyms: ['peanuts', 'peanut'] },
    { code: 'ALG004', codeSystem: 'INTERNAL', displayName: 'Latex', category: 'allergen', synonyms: ['latex'] },
    { code: 'ALG005', codeSystem: 'INTERNAL', displayName: 'Eggs', category: 'allergen', synonyms: ['eggs', 'egg'] },
    { code: 'ALG006', codeSystem: 'INTERNAL', displayName: 'Milk', category: 'allergen', synonyms: ['milk', 'dairy'] },

    // Common Procedures/Surgeries
    { code: 'PROC001', codeSystem: 'INTERNAL', displayName: 'Appendectomy', category: 'procedure', synonyms: ['appendix removal', 'appendectomy'] },
    { code: 'PROC002', codeSystem: 'INTERNAL', displayName: 'Cholecystectomy', category: 'procedure', synonyms: ['gallbladder removal', 'gallbladder surgery'] },
    { code: 'PROC003', codeSystem: 'INTERNAL', displayName: 'Cesarean Section', category: 'procedure', synonyms: ['c-section', 'cesarean delivery'] },
    { code: 'PROC004', codeSystem: 'INTERNAL', displayName: 'Knee Arthroscopy', category: 'procedure', synonyms: ['knee scope', 'arthroscopic knee surgery'] },
    { code: 'PROC005', codeSystem: 'INTERNAL', displayName: 'Colonoscopy', category: 'procedure', synonyms: ['colonoscopy'] },
    { code: 'PROC006', codeSystem: 'INTERNAL', displayName: 'Tonsillectomy', category: 'procedure', synonyms: ['tonsil removal', 'tonsillectomy'] }
];

async function seedMedicalCodes() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing codes
        await MedicalCode.deleteMany({});
        console.log('Cleared existing medical codes');

        // Insert new codes
        const insertedCodes = await MedicalCode.insertMany(medicalCodes);
        console.log(`Successfully seeded ${insertedCodes.length} medical codes`);

        // Log the inserted codes
        console.log('\nInserted Medical Codes:');
        insertedCodes.forEach(code => {
            console.log(`${code.code} (${code.codeSystem}): ${code.displayName} [${code.category}]`);
        });

        console.log('\nMedical codes seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding medical codes:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the seeding function
if (require.main === module) {
    seedMedicalCodes();
}

module.exports = { seedMedicalCodes };
