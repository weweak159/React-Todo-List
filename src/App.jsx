import { useEffect, useState } from "react"
import { NewTodoForm } from "./NewTodoForm"
import { TodoList } from "./TodoList"
import { supabase } from "./supabase"
import "./styles.css"

export default function App() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial todos
    const fetchTodos = async () => {
      const { data: todosData, error } = await supabase.from("todos").select()
      if (error) console.error("Fetch error:", error)
      setTodos(todosData ?? [])
      setLoading(false)
    }
    fetchTodos()

    // Realtime subscription
    const subscription = supabase
      .channel("todos")
      .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, (payload) => {
        console.log("Change received!", payload)
        fetchTodos() // Refetch for simplicity
      })
      .subscribe()

    return () => supabase.removeChannel(subscription)
  }, [])

  async function addTodo(title) {
    const newTodo = { 
      title, 
      completed: false,
      id: crypto.randomUUID() 
    }
    // Optimistic update
    setTodos(current => [...current, newTodo])
    
    const { error } = await supabase.from("todos").insert([newTodo])
    if (error) {
      console.error("Add error:", error)
      // Rollback on error
      setTodos(current => current.slice(0, -1))
    }
  }

  async function toggleTodo(id, completed) {
    // Optimistic
    setTodos(current => current.map(todo => 
      todo.id === id ? { ...todo, completed } : todo
    ))
    
    const { error } = await supabase.from("todos").update({ completed }).eq("id", id)
    if (error) console.error("Toggle error:", error)
  }

  async function deleteTodo(id) {
    // Optimistic
    setTodos(current => current.filter(todo => todo.id !== id))
    
    const { error } = await supabase.from("todos").delete().eq("id", id)
    if (error) console.error("Delete error:", error)
  }

  if (loading) {
    return <p>Loading todos...</p>
  }

  return (
    <>
      <NewTodoForm onSubmit={addTodo} />
      <h1 className="header">Todo List</h1>
      <TodoList todos={todos} toggleTodo={toggleTodo} deleteTodo={deleteTodo} />
    </>
  )
}