# Regional Authority Mobile API Guide

This guide provides the database schema and queries needed for the mobile app to fetch and display regional authority candidates, constituencies, and constituency candidates.

## Database Tables Created

### 1. `regional_authorities`
Stores information about regional authorities (e.g., regions in Namibia).

**Columns:**
- `id` (uuid) - Primary key
- `name` (text) - Unique name of the regional authority
- `description` (text) - Description of the regional authority
- `is_active` (boolean) - Whether the authority is active
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Last update timestamp

**Example Query:**
```javascript
// Fetch all active regional authorities
const { data: authorities, error } = await supabase
  .from('regional_authorities')
  .select('*')
  .eq('is_active', true)
  .order('name');
```

---

### 2. `constituencies`
Stores constituencies under each regional authority.

**Columns:**
- `id` (uuid) - Primary key
- `regional_authority_id` (uuid) - Foreign key to regional_authorities
- `name` (text) - Name of the constituency
- `description` (text) - Description of the constituency
- `is_active` (boolean) - Whether the constituency is active
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Last update timestamp

**Example Query:**
```javascript
// Fetch all active constituencies for a specific regional authority
const { data: constituencies, error } = await supabase
  .from('constituencies')
  .select('*')
  .eq('regional_authority_id', authorityId)
  .eq('is_active', true)
  .order('name');

// Fetch all active constituencies with their regional authority info
const { data: constituencies, error } = await supabase
  .from('constituencies')
  .select(`
    *,
    regional_authority:regional_authorities(id, name)
  `)
  .eq('is_active', true)
  .order('name');
```

---

### 3. `regional_authority_candidates`
Stores candidate profiles for regional authority elections.

**Columns:**
- `id` (uuid) - Primary key
- `regional_authority_id` (uuid) - Foreign key to regional_authorities
- `full_name` (text) - Candidate's full name
- `bio` (text) - Candidate biography
- `photo_url` (text) - URL to candidate photo (stored in 'candidate-photos' bucket)
- `position` (text) - Position running for
- `party_affiliation` (text) - Political party
- `contact_email` (text) - Contact email
- `contact_phone` (text) - Contact phone
- `is_active` (boolean) - Whether the candidate profile is active
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Last update timestamp

**Example Queries:**
```javascript
// Fetch all active regional candidates for a specific authority
const { data: candidates, error } = await supabase
  .from('regional_authority_candidates')
  .select('*')
  .eq('regional_authority_id', authorityId)
  .eq('is_active', true)
  .order('full_name');

// Fetch all active regional candidates with their authority info
const { data: candidates, error } = await supabase
  .from('regional_authority_candidates')
  .select(`
    *,
    regional_authority:regional_authorities(id, name)
  `)
  .eq('is_active', true)
  .order('full_name');
```

---

### 4. `constituency_candidates`
Stores candidate profiles for constituency elections.

**Columns:**
- `id` (uuid) - Primary key
- `constituency_id` (uuid) - Foreign key to constituencies
- `full_name` (text) - Candidate's full name
- `bio` (text) - Candidate biography
- `photo_url` (text) - URL to candidate photo (stored in 'candidate-photos' bucket)
- `position` (text) - Position running for
- `party_affiliation` (text) - Political party
- `contact_email` (text) - Contact email
- `contact_phone` (text) - Contact phone
- `is_active` (boolean) - Whether the candidate profile is active
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Last update timestamp

**Example Queries:**
```javascript
// Fetch all active constituency candidates for a specific constituency
const { data: candidates, error } = await supabase
  .from('constituency_candidates')
  .select('*')
  .eq('constituency_id', constituencyId)
  .eq('is_active', true)
  .order('full_name');

// Fetch all active constituency candidates with constituency and authority info
const { data: candidates, error } = await supabase
  .from('constituency_candidates')
  .select(`
    *,
    constituency:constituencies(
      id,
      name,
      regional_authority:regional_authorities(id, name)
    )
  `)
  .eq('is_active', true)
  .order('full_name');
```

---

## Storage Bucket

### `candidate-photos`
Public storage bucket for candidate profile photos.

**Upload Example:**
```javascript
// Admin uploads a photo (requires admin authentication)
const fileExt = file.name.split('.').pop();
const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

const { data, error } = await supabase.storage
  .from('candidate-photos')
  .upload(fileName, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('candidate-photos')
  .getPublicUrl(fileName);
```

---

## Complete Mobile App Integration Examples

### 1. Display All Regional Authorities with Their Candidates

```javascript
// Fetch regional authorities with their candidates
const fetchRegionalData = async () => {
  // Get all active regional authorities
  const { data: authorities, error: authError } = await supabase
    .from('regional_authorities')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (authError) throw authError;

  // For each authority, fetch its candidates
  const authoritiesWithCandidates = await Promise.all(
    authorities.map(async (authority) => {
      const { data: candidates, error: candError } = await supabase
        .from('regional_authority_candidates')
        .select('*')
        .eq('regional_authority_id', authority.id)
        .eq('is_active', true)
        .order('full_name');

      return {
        ...authority,
        candidates: candidates || []
      };
    })
  );

  return authoritiesWithCandidates;
};
```

### 2. Display Constituencies with Their Candidates

```javascript
// Fetch constituencies for a regional authority with candidates
const fetchConstituencyData = async (regionalAuthorityId) => {
  // Get all active constituencies for this authority
  const { data: constituencies, error: constError } = await supabase
    .from('constituencies')
    .select('*')
    .eq('regional_authority_id', regionalAuthorityId)
    .eq('is_active', true)
    .order('name');

  if (constError) throw constError;

  // For each constituency, fetch its candidates
  const constituenciesWithCandidates = await Promise.all(
    constituencies.map(async (constituency) => {
      const { data: candidates, error: candError } = await supabase
        .from('constituency_candidates')
        .select('*')
        .eq('constituency_id', constituency.id)
        .eq('is_active', true)
        .order('full_name');

      return {
        ...constituency,
        candidates: candidates || []
      };
    })
  );

  return constituenciesWithCandidates;
};
```

### 3. Search for Candidates by Name

```javascript
// Search for candidates across both regional and constituency levels
const searchCandidates = async (searchTerm) => {
  // Search regional authority candidates
  const { data: regionalCandidates, error: regError } = await supabase
    .from('regional_authority_candidates')
    .select(`
      *,
      regional_authority:regional_authorities(id, name)
    `)
    .ilike('full_name', `%${searchTerm}%`)
    .eq('is_active', true);

  // Search constituency candidates
  const { data: constituencyCandidates, error: constError } = await supabase
    .from('constituency_candidates')
    .select(`
      *,
      constituency:constituencies(
        id,
        name,
        regional_authority:regional_authorities(id, name)
      )
    `)
    .ilike('full_name', `%${searchTerm}%`)
    .eq('is_active', true);

  return {
    regionalCandidates: regionalCandidates || [],
    constituencyCandidates: constituencyCandidates || []
  };
};
```

### 4. Get Candidate Details by ID

```javascript
// Get detailed info for a regional authority candidate
const getRegionalCandidateDetails = async (candidateId) => {
  const { data, error } = await supabase
    .from('regional_authority_candidates')
    .select(`
      *,
      regional_authority:regional_authorities(id, name, description)
    `)
    .eq('id', candidateId)
    .eq('is_active', true)
    .single();

  return data;
};

// Get detailed info for a constituency candidate
const getConstituencyCandidateDetails = async (candidateId) => {
  const { data, error } = await supabase
    .from('constituency_candidates')
    .select(`
      *,
      constituency:constituencies(
        id,
        name,
        description,
        regional_authority:regional_authorities(id, name, description)
      )
    `)
    .eq('id', candidateId)
    .eq('is_active', true)
    .single();

  return data;
};
```

---

## Security & Permissions

All tables have Row Level Security (RLS) enabled with the following policies:

- **Public users** can view all active authorities, constituencies, and candidates
- **Admins and Super Admins** can create, update, and delete all records
- The `is_active` field controls visibility in the mobile app

**Note:** No authentication is required to view candidate data, but users must be authenticated as admin/super_admin to modify data.

---

## Prompt for Mobile App Project

Copy and paste this prompt into your mobile app project:

---

**Mobile App Integration Prompt:**

I need to integrate the regional authority candidates feature into the mobile app. The backend has the following tables:

1. **regional_authorities** - Contains regional authorities (e.g., Namibian regions)
2. **constituencies** - Contains constituencies under each regional authority
3. **regional_authority_candidates** - Candidates running for regional authority positions
4. **constituency_candidates** - Candidates running for constituency positions

All tables have RLS enabled and public read access for active records. Candidate photos are stored in the `candidate-photos` public storage bucket.

Please create:
1. A screen to list all regional authorities
2. A screen to show constituencies and regional candidates for a selected authority
3. A screen to show constituency candidates for a selected constituency
4. A candidate profile screen showing full details (photo, bio, position, party, contact info)
5. A search feature to find candidates by name across all levels

Use the Supabase queries from the REGIONAL_AUTHORITY_MOBILE_API.md file that was provided. The queries handle fetching authorities, constituencies, and candidates with proper relationships.
