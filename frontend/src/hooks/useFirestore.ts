'use client'

import { useEffect, useState } from 'react'
import {
  onSnapshot,
  query,
  queryEqual,
  type CollectionReference,
  type DocumentData,
  type Query,
  type QueryConstraint,
} from 'firebase/firestore'

interface UseCollectionResult<T> {
  data: T[]
  loading: boolean
  error: Error | null
}

/**
 * Subscribe to a Firestore collection with real-time updates.
 *
 * @example
 * const { data, loading, error } = useCollection(usersCollection, where('role', '==', 'admin'))
 */
export function useCollection<T extends DocumentData>(
  collectionRef: CollectionReference<T>,
  ...queryConstraints: QueryConstraint[]
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // collectionRef/queryConstraints are new object identities every render (Firestore
  // never memoizes them), so we can't put them straight into a useEffect dependency
  // array — that would tear down and rebuild the listener on every render, forever
  // serving stale cache and never reaching the server. Instead we compare the
  // resulting Query by Firestore's own logical equality and only update state (and
  // thus the effect dependency) when the query actually changed — the sanctioned
  // "adjusting state during render" pattern, safe because it's guarded by queryEqual.
  const nextQuery: Query<T> =
    queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : query(collectionRef)
  const [stableQuery, setStableQuery] = useState<Query<T>>(nextQuery)
  if (!queryEqual(stableQuery, nextQuery)) {
    setStableQuery(nextQuery)
  }

  useEffect(() => {
    const unsubscribe = onSnapshot(
      stableQuery,
      (snapshot) => {
        setData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as T[])
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [stableQuery])

  return { data, loading, error }
}
