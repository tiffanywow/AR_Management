# Mobile Polls API Documentation

This document describes the API endpoints for the mobile app to interact with the polls system.

## Base URL

```
https://[your-project-ref].supabase.co/functions/v1
```

## Authentication

All endpoints require authentication. Include the user's JWT token in the Authorization header:

```
Authorization: Bearer <user-jwt-token>
```

---

## 1. Get Active Polls

Fetch all active polls available for voting.

### Endpoint

```
GET /get-polls
```

### Request Headers

```json
{
  "Authorization": "Bearer <user-jwt-token>",
  "Content-Type": "application/json"
}
```

### Response

```json
{
  "polls": [
    {
      "id": "uuid",
      "question": "What is your favorite feature?",
      "description": "Help us understand what you value most",
      "poll_type": "single",
      "options": [
        {
          "text": "Broadcasting",
          "votes": 45
        },
        {
          "text": "Campaigns",
          "votes": 32
        },
        {
          "text": "Community Features",
          "votes": 28
        }
      ],
      "status": "active",
      "scheduled_start": "2024-01-15T10:00:00Z",
      "scheduled_end": "2024-01-22T10:00:00Z",
      "total_votes": 105,
      "total_participants": 105,
      "target_communities": ["community-uuid-1", "community-uuid-2"],
      "created_at": "2024-01-15T10:00:00Z",
      "user_voted": false,
      "user_votes": []
    }
  ]
}
```

### Response Fields

- `poll_type`: Either `"single"` (one choice only) or `"multiple"` (multiple choices allowed)
- `user_voted`: Boolean indicating if the current user has already voted
- `user_votes`: Array of option indices that the user voted for (empty if not voted)

### Error Responses

**401 Unauthorized**
```json
{
  "error": "Missing authorization header"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## 2. Submit Poll Vote

Submit a vote for one or more options in a poll.

### Endpoint

```
POST /submit-poll-vote
```

### Request Headers

```json
{
  "Authorization": "Bearer <user-jwt-token>",
  "Content-Type": "application/json"
}
```

### Request Body

```json
{
  "poll_id": "poll-uuid",
  "option_indices": [0]
}
```

**For Single Choice Polls:**
```json
{
  "poll_id": "poll-uuid",
  "option_indices": [1]
}
```

**For Multiple Choice Polls:**
```json
{
  "poll_id": "poll-uuid",
  "option_indices": [0, 2, 3]
}
```

### Request Fields

- `poll_id` (required): UUID of the poll
- `option_indices` (required): Array of option indices to vote for (0-based)
  - For single choice polls: Array must contain exactly 1 index
  - For multiple choice polls: Array can contain 1 or more indices

### Response

```json
{
  "success": true,
  "message": "Vote submitted successfully",
  "poll": {
    "id": "uuid",
    "question": "What is your favorite feature?",
    "options": [
      {
        "text": "Broadcasting",
        "votes": 46
      },
      {
        "text": "Campaigns",
        "votes": 32
      },
      {
        "text": "Community Features",
        "votes": 28
      }
    ],
    "total_votes": 106,
    "total_participants": 106
  }
}
```

### Error Responses

**400 Bad Request - Invalid Request**
```json
{
  "error": "Invalid request. poll_id and option_indices are required."
}
```

**400 Bad Request - Single Choice Violation**
```json
{
  "error": "This is a single choice poll. Only one option can be selected."
}
```

**400 Bad Request - Invalid Option Index**
```json
{
  "error": "Invalid option index: 5"
}
```

**400 Bad Request - Already Voted**
```json
{
  "error": "You have already voted on this poll"
}
```

**400 Bad Request - Poll Not Active**
```json
{
  "error": "Poll is not active"
}
```

**401 Unauthorized**
```json
{
  "error": "Missing authorization header"
}
```

**404 Not Found**
```json
{
  "error": "Poll not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## Poll Types

### Single Choice Poll (`poll_type: "single"`)

- Users can select **only one** option
- Attempting to submit multiple options will return a 400 error
- Example use cases: Yes/No questions, choosing one favorite

### Multiple Choice Poll (`poll_type: "multiple"`)

- Users can select **one or more** options
- Any number of options can be submitted in `option_indices`
- Example use cases: Select all that apply, multiple preferences

---

## Usage Example (JavaScript)

### Fetching Polls

```javascript
const fetchPolls = async (userToken) => {
  const response = await fetch(
    'https://[your-project-ref].supabase.co/functions/v1/get-polls',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data.polls;
};
```

### Submitting a Vote (Single Choice)

```javascript
const submitSingleChoiceVote = async (userToken, pollId, optionIndex) => {
  const response = await fetch(
    'https://[your-project-ref].supabase.co/functions/v1/submit-poll-vote',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        poll_id: pollId,
        option_indices: [optionIndex],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data;
};
```

### Submitting a Vote (Multiple Choice)

```javascript
const submitMultipleChoiceVote = async (userToken, pollId, optionIndices) => {
  const response = await fetch(
    'https://[your-project-ref].supabase.co/functions/v1/submit-poll-vote',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        poll_id: pollId,
        option_indices: optionIndices, // e.g., [0, 2, 3]
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data;
};
```

---

## UI Implementation Recommendations

### Displaying Poll Options

```javascript
const PollQuestion = ({ poll, onVote }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);

  const handleOptionSelect = (index) => {
    if (poll.poll_type === 'single') {
      // Single choice: replace selection
      setSelectedOptions([index]);
    } else {
      // Multiple choice: toggle selection
      if (selectedOptions.includes(index)) {
        setSelectedOptions(selectedOptions.filter(i => i !== index));
      } else {
        setSelectedOptions([...selectedOptions, index]);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0) {
      alert('Please select at least one option');
      return;
    }

    try {
      await onVote(poll.id, selectedOptions);
    } catch (error) {
      alert(error.message);
    }
  };

  // Check if user already voted
  if (poll.user_voted) {
    return <PollResults poll={poll} userVotes={poll.user_votes} />;
  }

  return (
    <div>
      <h2>{poll.question}</h2>
      {poll.description && <p>{poll.description}</p>}
      <p>{poll.poll_type === 'single' ? 'Select one' : 'Select all that apply'}</p>

      {poll.options.map((option, index) => (
        <button
          key={index}
          onClick={() => handleOptionSelect(index)}
          style={{
            backgroundColor: selectedOptions.includes(index) ? '#d1242a' : '#fff',
            color: selectedOptions.includes(index) ? '#fff' : '#000',
          }}
        >
          {poll.poll_type === 'single' ? '○' : '☐'} {option.text}
        </button>
      ))}

      <button onClick={handleSubmit}>Submit Vote</button>
    </div>
  );
};
```

### Displaying Results

```javascript
const PollResults = ({ poll, userVotes }) => {
  return (
    <div>
      <h2>{poll.question}</h2>
      <p>Total votes: {poll.total_participants}</p>

      {poll.options.map((option, index) => {
        const percentage = poll.total_participants > 0
          ? (option.votes / poll.total_participants * 100).toFixed(1)
          : 0;

        const userVoted = userVotes.includes(index);

        return (
          <div key={index}>
            <div>
              {option.text} {userVoted && '✓'}
            </div>
            <div>
              <div style={{ width: `${percentage}%`, backgroundColor: '#d1242a' }} />
            </div>
            <div>{option.votes} votes ({percentage}%)</div>
          </div>
        );
      })}
    </div>
  );
};
```

---

## Notes

- Polls are automatically filtered by status (only 'active' polls are returned)
- Users can only vote once per poll
- Vote counts are updated in real-time
- Invalid option indices will be rejected
- Single choice polls strictly enforce one selection only
- Multiple choice polls allow any number of selections
